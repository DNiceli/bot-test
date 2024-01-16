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
  const color = '#FFFFFF';

  const dishImage = await dish.populate('imageId');

  const url = dishImage.imageId.url;
  let allergens = '';
  if (dish.allergens.length > 0) {
    allergens = dish.allergens
      .map((allergen) => allergen.description)
      .join(', ');
  }

  let dietType = '';
  if (dish.dietType === 'vegan' || dish.dietType === 'vegetarisch') {
    dietType = dish.dietType.charAt(0).toUpperCase() + dish.dietType.slice(1);
  }
  let ecoInfoString = '';
  if (dish.co2 && dish.h2o) {
    ecoInfoString = `CO2: ${dish.co2}, H2O: ${dish.h2o}`;
  }
  let rating;
  if (dish.rating) rating = parseFloat(dish.rating.toString()) || 0;
  const favorites = dish.favorites || 0;
  const htmlTemplate = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        /* Basis-Styling */
        body {
          width: 500px;
          height: 200px;
          font-family: Arial, sans-serif;
          background-color: ${color};
          margin: 0;
          padding: 0;
          position: relative;
        }
        .image-placeholder {
          width: 180px;
          height: 180px;
          background-color: #CCCCCC;
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px; 
        }
        .name, .allergens, .eco-info {
          color: #333333;
          position: absolute;
          left: 20px;
          max-width: 280px;
        }
        .name {
          font-size: 15px;
          font-weight: bold;
          max-height: 40px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          top: 30px;
        }
        .price {
          color: #333333;
          position: absolute;
          color: #6495ed;
          font-weight: bold;
          font-size: 14px;
          bottom: 20px;
          left: 20px;
        }
        .allergens {
          max-height: 70px;
          color: #6a6a6a;
          font-size: 10px;
          top: 70px;
        }
        .eco-info {
          font-size: 8px;
          color: #5a5a5a;
          bottom: 50px;
        }
        .diet-info {
          position: absolute;
          bottom: 15px;
          right: 15px;
        }
        .rating {
          font-size: 10px;
          position: absolute;
          bottom: 80px;
          right: 200px;
        }
        .favorites {
          font-size: 10px;
          position: absolute;
          bottom: 60px;
          right: 200px;
        }
        .traffic-light {
          position: absolute;
          top: 10px;
          right: 10px;
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
          border-radius: 0 10px 0 0;
        }
        .icon-vegan, .icon-vegetarisch {
          width: 24px;
          height: 24px;
          border: 2px solid white;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <div class="image-placeholder">
      <img src="${url}" alt="Dish Image" style="width:100%; height:100%; border-radius: 10px;"></div>
      <div class="name">${dish.name}</div>
      <div class="price">${dish.price}</div>
      <div class="allergens">Allergene: ${allergens}</div>
      <div class="eco-info">${ecoInfoString}</div>
      <div class="diet-info">
      ${
        dietType === 'Vegan'
          ? '<div class="icon-vegan"><img src=https://www.stw.berlin/vendor/infomax/mensen/icons/15.png alt="Dish Image" style="width:100%; height:100%; border-radius: 10px;"></div>'
          : ''
      }
      ${
        dietType === 'Vegetarisch'
          ? '<div class="icon-vegetarisch"><img src=https://www.stw.berlin/vendor/infomax/mensen/icons/1.png alt="Dish Image" style="width:100%; height:100%; border-radius: 10px;"></div>'
          : ''
      }
      </div>
      <div class="traffic-light"></div>
      <div class="box"></div>
      <div class="rating">${rating > 0 ? 'Ø: ' + rating + ' / 5' : ''}</div>
      <div class="favorites">${favorites > 0 ? '♡: ' + favorites : ''}</div>
    
        </body>
      </html>
    `;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlTemplate);
  const pngBuffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: 500, height: 200 },
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
