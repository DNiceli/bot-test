const puppeteer = require('puppeteer');
const { uploadImageBuffer } = require('./image-creation-service');
const path = require('path');

async function generateMenuImage(weekMenus) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const htmlPath = path.join(__dirname, '../template/weekMenu.html');

  const weekMenusArray = Array.from(weekMenus).map(([day, dishes]) => ({
    day,
    dishes,
  }));

  console.log(weekMenusArray);

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`file://${htmlPath}`);
  /* eslint no-shadow: ["error", { "allow": ["weekMenusArray"] }]*/
  /* eslint-env es6*/
  /* global document*/
  /* eslint no-undef: "error"*/
  await page.evaluate((weekMenusArray) => {
    function fillMenuTemplate(weekMenusArray) {
      weekMenusArray.forEach(({ day, dishes }) => {
        const dayDiv = document.getElementById(day);
        if (!dayDiv) {
          console.warn(`Kein Element gefunden für den Tag: ${day}`);
          return;
        }

        dishes.forEach((dish) => {
          const dishElement = createDishElement(dish);
          dayDiv.appendChild(dishElement);
        });
      });
    }

    function createDishElement(dish) {
      const dishDiv = document.createElement('div');
      dishDiv.className = 'dish';

      const nameEl = document.createElement('h3');
      nameEl.textContent = dish.name;
      dishDiv.appendChild(nameEl);

      const detailsEl = document.createElement('p');
      detailsEl.innerHTML = `
          <strong>Kategorie:</strong> ${dish.category}<br>
          <strong>Preis:</strong> ${dish.price}<br>
          <strong>CO2-Emissionen:</strong> ${dish.co2 || 'N/A'}<br>
          <strong>H2O-Verbrauch:</strong> ${dish.h2o || 'N/A'}<br>
          <strong>Ampel:</strong> ${dish.ampel}<br>
          <strong>Diättyp:</strong> ${dish.dietType}
      `;
      dishDiv.appendChild(detailsEl);

      if (dish.allergens && dish.allergens.length > 0) {
        const allergensEl = document.createElement('ul');
        dish.allergens.forEach((allergen) => {
          const allergenItem = document.createElement('li');
          allergenItem.textContent = `${allergen.description} (${allergen.number})`;
          allergensEl.appendChild(allergenItem);
        });
        dishDiv.appendChild(allergensEl);
      }
      return dishDiv;
    }

    fillMenuTemplate(weekMenusArray);
  }, weekMenusArray);

  const buffer = await page.screenshot({ format: 'png', fullPage: true });
  await browser.close();
  return buffer;
}

async function generateMenuCard(dish) {
  // const categoryColors = {
  //   Vorspeisen: '#FFDAB9',
  //   Essen: '#ADD8E6',
  //   Salate: '#FFFACD',
  //   Suppen: '#FFFACD',
  //   Beilagen: '#FFFACD',
  //   Desserts: '#FFFACD',
  //   Aktionen: '#E6E6FA',
  // };
  //
  // const color = categoryColors[dish.category] || '#FFFFFF';
  const color = '#FFFFFF';

  const dishImage = await dish.populate('imageId');

  const url = dishImage.imageId.url;
  let allergens = '';
  if (dish.allergens.length > 0) {
    allergens = dish.allergens
      .map((allergen) => allergen.description)
      .join(', ');
  }
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            width: 400px;
            height: 200px;
            font-family: Arial, sans-serif;
            background-color: ${color};
            margin: 0;
            padding: 0;
            position: relative;
          }
          .image-placeholder {
            width: 80px;
            height: 80px;
            background-color: #CCCCCC;
            position: absolute;
            top: 20px;
            left: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .name {
            font-size: 17px;
            font-weight: bold;
            color: #333333;
            position: absolute;
            top: 20px;
            left: 120px;
          }
          .price {
            font-size: 14px;
            color: #333333;
            position: absolute;
            top: 120px;
            left: 20px;
          }
          .allergens {
            font-size: 10px;
            color: #333333;
            position: absolute;
            top: 180px;
            left: 20px;
          }
          .diet-type {
            font-size: 12px;
            color: #555;
            position: absolute;
            top: 50px;
            left: 120px;
          }
          .eco-info {
            font-size: 10px;
            color: #555;
            position: absolute;
            bottom: 10px;
            right: 40px;
          }
          .traffic-light {
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-top: 40px solid ${
              dish.ampel === 'Rot'
                ? '#ff0000'
                : dish.ampel === 'Gelb'
                ? '#ffff00'
                : '#00ff00'
            };
            border-left: 40px solid transparent;
          }
        </style>
      </head>
      <body>
      <div class="image-placeholder">
      <img src="${url}" alt="Dish Image" style="width:100%; height:100%;"></div>
        <div class="name">${dish.name}</div>
        <div class="price">Preis: ${dish.price}</div>
        <div class="allergens">Allergene: ${allergens}</div>
        <div class="eco-info">CO2: ${dish.co2}, H2O: ${dish.h2o}</div>
        <div class="traffic-light"></div>
      </body>
    </html>`;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlTemplate);
  const pngBuffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: 400, height: 200 },
  });
  await browser.close();
  const returnObject = {
    id: dish._id,
    image: pngBuffer,
    name: dish.name,
    category: dish.category,
  };
  return returnObject;
}

async function uploadAndAddDishcardUrlToDish(dish) {
  const dishCardObj = await generateMenuCard(dish);
  const dishCard = await uploadImageBuffer(dishCardObj.image);
  dish.dishCard = dishCard.url;
  return dish;
}

module.exports = {
  generateMenuCard,
  uploadAndAddDishcardUrlToDish,
  generateMenuImage,
};
