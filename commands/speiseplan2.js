require("dotenv").config();
const axios = require("axios");
const sharp = require("sharp");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { SlashCommandBuilder } = require("discord.js");
const Dish = require("../models/Dish.js");
const Favorite = require("../models/Favorite.js");

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan2")
    .setDescription("sieht speiseplan mensadaten"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const url = process.env.mensaUrl2;
      const menu = new Map();
      await axios
        .post(
          url,
          new URLSearchParams({
            resources_id: "527", // bht ID: 527
            date: "2023-10-04", // Datum
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
                const dish = {
                  name: $(meal)
                    .find(".col-xs-6.col-md-5 > .bold")
                    .text()
                    .trim(),
                  price: $(meal)
                    .find(".col-xs-12.col-md-3.text-right")
                    .text()
                    .trim(),
                  allergens: $(meal).attr("lang"),
                  ampelpunkt: $(meal).find("img.splIcon").attr("alt"),
                  h2p: $(meal)
                    .find("img[aria-describedby^='tooltip_H2O']")
                    .attr("alt"),
                  co2: $(meal)
                    .find("img[aria-describedby^='tooltip_CO2']")
                    .attr("alt"),
                };
                console.log(dish.allergens);
                dishes.push(dish);

                Dish;
              });

            menu.set(group, dishes);
          });
          //console.log(menu);
        })
        .catch((error) => {
          console.log(error);
        });

      const deserts = menu.get("Desserts");
      const img = await generateMenuCard(deserts[0]);
      const message = await interaction.editReply({
        content: "Here's the menu card:",
        files: [img],
      });

      for (const category of menu.keys()) {
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
            (currentIndex - 1 + menu.get(currentCategory).length) %
            menu.get(currentCategory).length;
        } else if (reactedEmoji === arrowRight) {
          currentIndex = (currentIndex + 1) % menu.get(currentCategory).length;
        } else if (reactedEmoji === star) {
          if (!interaction.guild) return; // Returns as there is no guild
          var guild = interaction.guild.id;
          var userID = interaction.user.id;
          var dishId = menu.get(currentCategory)[currentIndex].name;
          Favorite.createOrUpdateFavorite(guild, userID, dishId);
        }

        const dish = menu.get(currentCategory)[currentIndex];

        const newImg = await generateMenuCard(dish, currentCategory);
        await message.edit({
          content: "Here's the menu card:",
          files: [newImg],
        });

        await reaction.users.remove(interaction.user.id);
      });

      collector.on("end", () => {
        // Remove reactions when the collector ends
        message.reactions.removeAll();
      });
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

async function generateMenuCard(dish, currentCategory) {
  const categoryColors = {
    Vorspeisen: "#FFDAB9",
    Essen: "#ADD8E6",
    Salate: "#FFFACD",
    Suppen: "#FFFACD",
    Beilagen: "#FFFACD",
    Desserts: "#FFFACD",
    Aktionen: "#E6E6FA",
  };

  const color = categoryColors[currentCategory] || "#FFFFFF"; // default to white if category is unknown

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
          width: 60px;
          height: 60px;
          background-color: #CCCCCC;
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .name {
          font-size: 18px;
          font-weight: bold;
          color: #333333;
          position: absolute;
          top: 20px;
          left: 100px;
        }
        .price {
          font-size: 14px;
          color: #333333;
          position: absolute;
          top: 60px;
          left: 100px;
        }
        .allergens {
          font-size: 10px;
          color: #333333;
          position: absolute;
          top: 120px;
          left: 20px;
        }
      </style>
    </head>
    <body>
      <div class="image-placeholder">IMG</div>
      <div class="name">${dish.name}</div>
      <div class="price">Price: ${dish.price}</div>
      <div class="allergens">Allergens: ${dish.allergens}</div>
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
  return pngBuffer;
}
