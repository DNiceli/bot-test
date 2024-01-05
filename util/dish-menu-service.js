require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const Dish = require('../models/Dish.js');
const Menu = require('../models/Dailymenu.js');
const Allergen = require('../models/Allergen.js');
const { createUploadAndSaveDishPicture } = require('./image-creation-service');
const { uploadAndAddDishcardUrlToDish } = require('./speiseplan-util.js');

async function fetchAndSaveDishes(date) {
  try {
    let allergenDb = await Allergen.find();
    if (!allergenDb) {
      allergenDb = await fetchAndSaveAllergens();
    }
    const menu = new Map();
    const $ = await requestSiteAndLoadHTML(date, '527');
    /* eslint no-shadow: ["error", { "allow": ["_"] }]*/
    /* eslint-env es6*/
    $('.container-fluid.splGroupWrapper').each((_, groupWrapper) => {
      const group = $(groupWrapper).find('.splGroup').text().trim();
      const dishes = [];
      $(groupWrapper)
        .find('.row.splMeal')
        .each(async (_, meal) => {
          const dish = extractDishInfo($, meal, allergenDb);
          dishes.push(dish);
        });
      menu.set(group, dishes);
    });
    createAndSaveDishMenu(menu);
    return menu;
  } catch (error) {
    console.error(error);
  }
}

function extractDishInfo($, meal, allergenDb) {
  const [dietType, ampel, h2o, co2] = extractIconInfo($, meal);
  const name = $(meal).find('.col-xs-6.col-md-5 > .bold').text().trim();
  const price = $(meal).find('.col-xs-12.col-md-3.text-right').text().trim();
  const allergens = $(meal)
    .find('div.kennz.ptr.toolt table tr')
    .map((i, elem) => $(elem).find('td').eq(1).text().trim())
    .get()
    .map((allergenDesc) => allergenLookup(allergenDesc, allergenDb))
    .filter((allergen) => allergen !== null);

  const dish = {
    name: name,
    price: price,
    allergens: allergens.length ? allergens : [],
    ampel: ampel,
    h2o: h2o,
    co2: co2,
    dietType: dietType,
  };
  console.log(dish);
  return dish;
}

const allergenLookup = (description, allergens) => {
  const find =
    allergens.find((allergen) => allergen.description === description) || null;
  return { number: find.number, description: find.description };
};

function extractIconInfo($, meal) {
  let dietType = 'keine Angabe';
  let ampelColor = 'Unbekannt';
  let h2o = '';
  let co2 = '';
  $(meal)
    .find('img.splIcon')
    .each((_, icon) => {
      const altText = $(icon).attr('alt');
      if (altText.includes('Vegan')) {
        dietType = 'vegan';
      } else if (altText.includes('Vegetarisch')) {
        dietType = 'vegetarisch';
      }
      if (altText.includes('Grüner')) {
        ampelColor = 'Grün';
      } else if (altText.includes('Roter')) {
        ampelColor = 'Rot';
      } else if (altText.includes('Gelber')) {
        ampelColor = 'Gelb';
      }
      if ($(icon).attr('aria-describedby').startsWith('tooltip_H2O')) {
        h2o = $(icon)
          .parent()
          .find('.shocl_content')
          .last()
          .text()
          .trim()
          .split('Wasserverbrauch')[0];
      }
      if ($(icon).attr('aria-describedby').startsWith('tooltip_CO2')) {
        co2 = $(icon)
          .parent()
          .find('.shocl_content')
          .first()
          .text()
          .trim()
          .split('CO2')[0];
      }
    });
  return [dietType, ampelColor, h2o, co2];
}

async function fetchAndSaveAllergens(date) {
  try {
    const allergens = [];
    const $ = await requestSiteAndLoadHTML(date, '527');

    $('input.itemkennz').each((_, element) => {
      const id = $(element).attr('id').replace('stoff-', '');
      let description =
        $(element).next('span').attr('title') ||
        $(element).parent().text().trim();

      // regex um die Nummerierung mit ggf einem Buchstaben zu entfernen
      description = description.replace(/^\(\d+[a-zA-Z]?\)\s*/, '');

      const allergen = {
        nr: id,
        beschreibung: description,
      };
      allergens.push(allergen);
    });

    for (const allergenData of allergens) {
      const existingAllergen = await Allergen.findOne({
        number: allergenData.nr,
      });

      if (existingAllergen) {
        if (existingAllergen.description !== allergenData.beschreibung) {
          existingAllergen.description = allergenData.beschreibung;
          await existingAllergen.save();
        }
      } else {
        const newAllergen = new Allergen({
          number: allergenData.nr,
          description: allergenData.beschreibung,
        });
        await newAllergen.save();
      }
    }
    return allergens;
  } catch (error) {
    console.error('Fehler beim Abrufen der Allergene:', error);
    throw error;
  }
}

async function requestSiteAndLoadHTML(date, resources_id) {
  const url = process.env.mensaUrl2;
  if (process.env.OVERRIDE_DATE === 'true') {
    date = '2023-12-20';
  }
  const response = await axios.post(
    url,
    new URLSearchParams({
      resources_id: resources_id,
      date: date,
    }),
    {
      headers: {
        'x-requested-with': 'XMLHttpRequest',
      },
    },
  );
  const html = response.data;
  const $ = cheerio.load(html);
  return $;
}

async function createAndSaveDishMenu(menu) {
  const today = new Date().toISOString().split('T')[0];
  let dailyMenu = await Menu.findOne({ date: today });

  if (!dailyMenu) {
    dailyMenu = new Menu({
      date: today,
      dishes: [],
    });
  } else {
    dailyMenu.dishes = dailyMenu.dishes.map((dishId) => dishId.toString());
  }

  for (const category of menu.keys()) {
    const dishes = menu.get(category);
    for (const dish of dishes) {
      const dishDocument = await createOrUpdateDish(dish, category);

      if (!dailyMenu.dishes.includes(dishDocument._id.toString())) {
        dailyMenu.dishes.push(dishDocument._id);
      }
    }
  }

  await dailyMenu.save();
  console.log(`Menu for ${today} updated`);
}

async function createOrUpdateDish(dish, category) {
  let existingDish = await Dish.findOne({ name: dish.name });

  if (!existingDish) {
    const imageID = await createUploadAndSaveDishPicture(dish.name);
    existingDish = await Dish.create({
      name: dish.name,
      category: category,
      price: dish.price,
      allergens: dish.allergens,
      co2: dish.co2,
      h2o: dish.h2o,
      ampel: dish.ampel,
      imageId: imageID,
      dietType: dish.dietType,
    });
    await uploadAndAddDishcardUrlToDish(existingDish);
    existingDish.save();
    console.log(`Dish created: ${existingDish.name}`);
  } else {
    let needsUpdate = false;

    if (existingDish.price !== dish.price) {
      existingDish.price = dish.price;
      needsUpdate = true;
      console.log('Updategrund: price ');
    }
    if (
      JSON.stringify(existingDish.allergens) !== JSON.stringify(dish.allergens)
    ) {
      existingDish.allergens = dish.allergens;
      needsUpdate = true;
    }
    if (existingDish.co2 !== dish.co2) {
      existingDish.co2 = dish.co2;
      needsUpdate = true;
      console.log('Updategrund: co2 ' + dish.co2);
    }
    if (existingDish.h2o !== dish.h2o) {
      existingDish.h2o = dish.h2o;
      needsUpdate = true;
      console.log('Updategrund: h2o ' + dish.h2o);
    }
    if (existingDish.ampel !== dish.ampel) {
      existingDish.ampel = dish.ampel;
      needsUpdate = true;
      console.log('Updategrund: ampel' + dish.ampel);
    }
    if (existingDish.dietType !== dish.dietType) {
      existingDish.dietType = dish.dietType;
      needsUpdate = true;
      console.log('Updategrund: diet' + dish.dietType);
    }
    if (!existingDish.dishCard) {
      needsUpdate = true;
      await uploadAndAddDishcardUrlToDish(existingDish);
      console.log('Updategrund: dishcard ' + existingDish.dishCard);
    }
    if (needsUpdate) {
      await existingDish.save();
      console.log(`Dish updated: ${existingDish.name}`);
    } else {
      console.log(`No updates needed for: ${existingDish.name}`);
    }
  }
  return existingDish;
}

async function getTodaysMenu(date) {
  try {
    if (process.env.OVERRIDE_DATE === 'true') {
      date = '2023-12-20';
    }
    const dailyMenu = await Menu.findOne({ date: date }).populate('dishes');
    return dailyMenu.dishes;
  } catch (error) {
    console.error('Error fetching today\'s menu:', error);
    return [];
  }
}

function getWeekDayName(dayIndex) {
  const weekDays = [
    'sonntag',
    'montag',
    'dienstag',
    'mittwoch',
    'donnerstag',
    'freitag',
    'samstag',
  ];
  return weekDays[dayIndex];
}

async function getWeekMenu(date) {
  const weekDays = getWeekDays(date);
  const weekMenu = new Map();
  for (const day of weekDays) {
    const dishes = await getTodaysMenu(day.toISOString().split('T')[0]);
    const dayName = getWeekDayName(day.getDay());
    weekMenu.set(dayName, dishes);
  }
  return weekMenu;
}

function getWeekDays(date) {
  const currentDate = new Date(date);

  const currentDayOfWeek = currentDate.getDay();

  const differenceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(currentDate);
  monday.setDate(monday.getDate() + differenceToMonday);

  const weekDays = [];

  for (let i = 0; i < 5; i++) {
    const weekDay = new Date(monday);
    weekDay.setDate(monday.getDate() + i);
    weekDays.push(weekDay);
  }

  return weekDays;
}

module.exports = {
  fetchAndSaveDishes,
  getTodaysMenu,
  fetchAndSaveAllergens,
  getWeekMenu,
};
