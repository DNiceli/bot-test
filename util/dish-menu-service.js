require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const Dish = require("../models/Dish.js");
const Menu = require("../models/Dailymenu.js");
const Allergen = require("../models/Allergen.js");
const createUploadAndSaveDishPicture = require("./image-creation-service");

async function fetchAndSaveDishes(date) {
  try {
    const url = process.env.mensaUrl2;
    const menu = new Map();
    let allergens = await Allergen.find();
    if (!allergens) {
      allergens = await fetchAndSaveAllergens();
    }
    await axios
      .post(
        url,
        new URLSearchParams({
          resources_id: "527",
          date: "2023-12-20", //date, // "YYYY-MM-DD"
        }),
        {
          headers: {
            "x-requested-with": "XMLHttpRequest",
          },
        }
      )
      .then((response) => {
        const html = response.data;
        const $ = cheerio.load(html);

        $(".container-fluid.splGroupWrapper").each((_, groupWrapper) => {
          const group = $(groupWrapper).find(".splGroup").text().trim();
          const dishes = [];

          $(groupWrapper)
            .find(".row.splMeal")
            .each(async (_, meal) => {
              let dietType = "keine Angabe"; // Standardwert
              const dietInfo = $(meal)
                .find("img.splIcon")
                .map((i, elem) => {
                  const altText = $(elem).attr("alt");
                  if (altText.includes("Vegan")) {
                    return "vegan";
                  } else if (altText.includes("Vegetarisch")) {
                    return "vegetarisch";
                  }
                  return null;
                })
                .get();

              if (dietInfo.includes("vegan")) {
                dietType = "vegan";
              } else if (dietInfo.includes("vegetarisch")) {
                dietType = "vegetarisch";
              }

              let ampelText = $(meal).find("img.splIcon").attr("alt");

              let ampelColor;
              if (ampelText.includes("Grüner")) {
                ampelColor = "Grün";
              } else if (ampelText.includes("Roter")) {
                ampelColor = "Rot";
              } else if (ampelText.includes("Gelber")) {
                ampelColor = "Gelb";
              } else {
                ampelColor = "Unbekannt";
              }
              const dish = {
                name: $(meal).find(".col-xs-6.col-md-5 > .bold").text().trim(),
                price: $(meal).find(".col-xs-12.col-md-3.text-right").text().trim(),
                allergens: $(meal)
                  .find("div.kennz.ptr.toolt table tr")
                  .map((i, elem) => $(elem).find("td").eq(1).text().trim())
                  .get()
                  .map((allergenDesc) => allergenLookup(allergenDesc, allergens))
                  .filter((allergen) => allergen !== null),
                ampel: ampelColor,
                h2o: $(meal)
                  .find("img[aria-describedby^='tooltip_H2O']")
                  .parent()
                  .find(".shocl_content")
                  .last()
                  .text()
                  .trim()
                  .split("Wasserverbrauch")[0],
                co2: $(meal)
                  .find("img[aria-describedby^='tooltip_CO2']")
                  .parent()
                  .find(".shocl_content")
                  .first()
                  .text()
                  .trim()
                  .split("CO2")[0],
                dietType: dietType,
              };
              if (!dish.allergens) {
                dish.allergens = [];
              }
              console.log("allergens " + dish.allergens);
              dishes.push(dish);
            });

          menu.set(group, dishes);
        });
      })

      .catch((error) => {
        console.log(error);
      });
    createDishes(menu);
    return menu;
  } catch (error) {
    console.error(error);
  }
}

const allergenLookup = (description, allergens) => {
  return allergens.find((allergen) => allergen.description === description) || null;
};

async function fetchAndSaveAllergens(date) {
  try {
    const url = process.env.mensaUrl2;
    const allergens = [];

    const response = await axios.post(
      url,
      new URLSearchParams({
        resources_id: "527",
        date: "2023-12-20", // oder date
      }),
      {
        headers: {
          "x-requested-with": "XMLHttpRequest",
        },
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    $("input.itemkennz").each((_, element) => {
      const id = $(element).attr("id").replace("stoff-", "");
      let description = $(element).next("span").attr("title") || $(element).parent().text().trim();

      description = description.replace(/^\(\d+[a-zA-Z]?\)\s*/, ""); //regex um die Nummerierung mit ggf einem Buchstaben zu entfernen

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
    console.log(allergens);
    return allergens;
  } catch (error) {
    console.error("Fehler beim Abrufen der Allergene:", error);
    throw error;
  }
}

async function createDishes(menu) {
  const today = new Date().toISOString().split("T")[0];
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
    console.log(`Dish created: ${existingDish.name}`);
  } else {
    let needsUpdate = false;

    if (existingDish.price !== dish.price) {
      existingDish.price = dish.price;
      needsUpdate = true;
      console.log("Updategrund: price ");
    }
    if (existingDish.allergens !== dish.allergens) {
      existingDish.allergens = dish.allergens;
      needsUpdate = true;
      console.log("Updategrund: allergens ");
    }
    if (existingDish.co2 !== dish.co2) {
      existingDish.co2 = dish.co2;
      needsUpdate = true;
      console.log("Updategrund: co2 " + dish.co2);
    }
    if (existingDish.h2o !== dish.h2o) {
      existingDish.h2o = dish.h2o;
      needsUpdate = true;
      console.log("Updategrund: h2o " + dish.h2o);
    }
    if (existingDish.ampel !== dish.ampel) {
      existingDish.ampel = dish.ampel;
      needsUpdate = true;
      console.log("Updategrund: ampel" + dish.ampel);
    }
    if (existingDish.dietType !== dish.dietType) {
      existingDish.dietType = dish.dietType;
      needsUpdate = true;
      console.log("Updategrund: diet" + dish.dietType);
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

async function getTodaysMenu() {
  try {
    let today = new Date().toISOString().split("T")[0];
    if (process.env.OVERRIDE_DATE === "true") {
      today = "2023-12-20";
    }
    const dailyMenu = await Menu.findOne({ date: today }).populate("dishes");
    return dailyMenu.dishes;
  } catch (error) {
    console.error("Error fetching today's menu:", error);
    return [];
  }
}

module.exports = {
  fetchAndSaveDishes,
  getTodaysMenu,
  fetchAndSaveAllergens,
};
