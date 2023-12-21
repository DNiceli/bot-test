require("dotenv").config();
const sharp = require("sharp");
const puppeteer = require("puppeteer");
const { SlashCommandBuilder } = require("discord.js");
const Favorite = require("../models/Favorite.js");
const Menu = require("../models/Dailymenu.js");

const arrowLeft = "\u2B05";
const arrowRight = "\u27A1";
const star = "\u2b50";

const categoryEmojis = {
  Vorspeisen: "\uD83C\uDF4F",
  Salate: "\uD83E\uDD57",
  Essen: "\uD83C\uDF5B",
  Desserts: "\uD83C\uDF70",
  Suppen: "\uD83C\uDF5C",
  Aktionen: "\uD83D\uDC51",
  Beilagen: "\uD83C\uDF5A",
};

let menuImgs = {
  Vorspeisen: [],
  Salate: [],
  Essen: [],
  Desserts: [],
  Suppen: [],
  Aktionen: [],
  Beilagen: [],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan2")
    .setDescription("sieht speiseplan mensadaten"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const today = new Date().toISOString().split("T")[0];
      let dailyMenu = await Menu.findOne({ date: today });
      if (!dailyMenu) {
        await interaction.editReply("No menu found for today");
      } else {
        let imgs = [];
        dailyMenu = await dailyMenu.populate("dishes");

        for (const dish of dailyMenu.dishes) {
          let dishImgObj = await generateMenuCard(dish);
          menuImgs[dishImgObj.category].push(dishImgObj);
        }

        let img = menuImgs["Desserts"][0].image;
        const message = await interaction.editReply({
          content: "Here's the menu card:",
          files: [img],
        });

        for (const category of Object.keys(menuImgs)) {
          console.log(category);
          await message.react(categoryEmojis[category]);
        }

        await message.react(arrowLeft);
        await message.react(arrowRight);
        await message.react(star);

        // Create the message collector to listen for reactions of users
        const filter = (reaction, user) => user.id === interaction.user.id;
        const collector = message.createReactionCollector({
          filter,
          time: 60000,
        });

        let currentCategory = "Desserts";
        let currentIndex = 0;

        collector.on("collect", async (reaction, user) => {
          const reactedEmoji = reaction.emoji.name;
          const selectedCategory = Object.keys(categoryEmojis).find(
            (category) => categoryEmojis[category] === reactedEmoji
          );

          if (selectedCategory) {
            currentCategory = selectedCategory;
            currentIndex = 0;
          } else if (reactedEmoji === arrowLeft) {
            currentIndex =
              (currentIndex - 1 + menuImgs[currentCategory].length) %
              menuImgs[currentCategory].length;
          } else if (reactedEmoji === arrowRight) {
            currentIndex =
              (currentIndex + 1) % menuImgs[currentCategory].length;
          } else if (reactedEmoji === star) {
            if (!interaction.guild) return; // Returns as there is no guild
            var guild = interaction.guild.id;
            var userID = interaction.user.id;
            var dishId = menuImgs[currentCategory][currentIndex]._id;
            Favorite.createOrUpdateFavorite(guild, userID, dishId);
          }

          const dish = menuImgs[currentCategory][currentIndex];
          if (!dish) {
            console.log("No dish found");
          } else {
            const newImg = dish.image;
            await message.edit({
              content: "Here's the menu card:",
              files: [newImg],
            });
          }
          await reaction.users.remove(interaction.user.id);
        });

        collector.on("end", () => {
          // Remove reactions when the collector ends
          message.reactions.removeAll();
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply("ERROR ERROR, siehe console");
    }
  },
};

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
      <div class="allergens">Allergene: ${dish.allergens}</div>
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
