require("dotenv").config();
const axios = require("axios");
const sharp = require("sharp");
const cheerio = require("cheerio");
const { MessageAttachment } = require("discord.js");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Speisekarte } = require("../dbObjects.js");

const arrowLeft = "\u2B05";
const arrowRight = "\u27A1";

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
            resources_id: "527",
            date: "2023-03-24",
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
              .each((_, meal) => {
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
        }

        const dish = menu.get(currentCategory)[currentIndex];
        const newImg = await generateMenuCard(dish);
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

async function generateMenuCard(dish) {
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
