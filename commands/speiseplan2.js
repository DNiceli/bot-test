require("dotenv").config();
const axios = require("axios");
const sharp = require("sharp");
const cheerio = require("cheerio");
const { MessageAttachment } = require("discord.js");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Speisekarte } = require("../dbObjects.js");

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
          "https://www.stw.berlin/xhr/speiseplan-wochentag.html",
          new URLSearchParams({
            resources_id: "527",
            date: "2023-03-23",
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

      const pngs = [];
      const speisekarte = new EmbedBuilder()
        .setTitle(`__Speiseplan__`)
        .setColor("#00ff00")
        .setDescription("Menü für heute")
        .setTimestamp();

      menu.forEach(async (meals, category) => {
        const mealStrings = meals
          .map(
            (meal) => `${meal.name} - ${meal.price}`
            //`**${meal.name}** - ${meal.price}\n${meal.description}\n_Last offered: ${meal.lastOffered}_`
          )
          .join("\n\n");

        speisekarte.addFields({ name: " ", value: `**${category}**` });
        speisekarte.addFields({ name: " ", value: mealStrings });
      });

      const deserts = menu.get("Desserts");
      console.log(deserts[0]);
      const img = await generateMenuCard(deserts[0]);

      console.log(pngs[0]);
      await interaction.editReply({
        content: "Here's the menu card:",
        files: [img],
      });

      await interaction.editReply({ embeds: [speisekarte] });
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
