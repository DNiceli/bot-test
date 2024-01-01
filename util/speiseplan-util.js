const sharp = require("sharp");
const puppeteer = require("puppeteer");
const { uploadBuffer, uploadImageBuffer } = require("./image-creation-service");

async function generateMenuCard2(dish) {
  const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
    <rect x="0" y="0" width="400" height="200" fill="#f8f8f8" />
    <text x="20" y="40" font-size="24" font-weight="bold" fill="#333333">__NAME__</text>
    <text x="20" y="80" font-size="18" fill="#333333">Price: __PRICE__</text>
    <text x="20" y="120" font-size="18" fill="#333333">Allergens: __ALLERGENS__</text>
  </svg>`;

  const svgData = svgTemplate
    .replace("__NAME__", dish.name)
    .replace("__PRICE__", dish.price)
    .replace("__ALLERGENS__", dish.allergens);

  console.log(svgData);

  const pngBuffer = await sharp(Buffer.from(svgData)).png().toBuffer();
  return pngBuffer;
}

async function generateMenuCard(dish) {
  const categoryColors = {
    Vorspeisen: "#FFDAB9",
    Essen: "#ADD8E6",
    Salate: "#FFFACD",
    Suppen: "#FFFACD",
    Beilagen: "#FFFACD",
    Desserts: "#FFFACD",
    Aktionen: "#E6E6FA",
  };

  const color = categoryColors[dish.category] || "#FFFFFF"; // default to white if category is unknown

  let dishImage = await dish.populate("imageId");
  let url = dishImage.imageId.url;
  let allergens = "";
  if (dish.allergens.length > 0) {
    allergens = dish.allergens.map((allergen) => allergen.description).join(", ");
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
        </style>
      </head>
      <body>
      <div class="image-placeholder">
      <img src="${url}" alt="Dish Image" style="width:100%; height:100%;"></div>
        <div class="name">${dish.name}</div>
        <div class="price">Preis: ${dish.price}</div>
        <div class="allergens">Allergene: ${allergens}</div>
      </body>
    </html>`;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlTemplate);
  const pngBuffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: 400, height: 200 },
  });
  await browser.close();
  let returnObject = {
    id: dish._id,
    image: pngBuffer,
    name: dish.name,
    category: dish.category,
  };
  return returnObject;
}

function uploadAndAddDishcardUrlToDish(dish) {
  return generateMenuCard(dish)
    .then((dishCardObject) => {
      uploadImageBuffer(dishCardObject.image)
        .then((result) => {
          dish.dishCard = result.url;
        })
        .catch((error) => {
          console.error(error);
        });
    })
    .catch((error) => {
      console.error(error);
    });
}

module.exports = {
  generateMenuCard,
  uploadAndAddDishcardUrlToDish,
};
