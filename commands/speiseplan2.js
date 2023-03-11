require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Speisekarte } = require("../dbObjects.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan2")
    .setDescription("sieht speiseplan mensadaten"),
  async execute(interaction) {
    try {
      const url = process.env.mensaUrl2;
      const menuMap = new Map();
      await axios
        .post(
          "https://www.stw.berlin/xhr/speiseplan-wochentag.html",
          new URLSearchParams({
            resources_id: "527",
            date: "2023-03-01",
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

          $(".splGroupWrapper .splGroup").each((index, element) => {
            const category = $(element).text().trim();
            const dishes = [];

            $(element)
              .nextUntil(".splGroup")
              .each((i, el) => {
                const name = $(el)
                  .find(".col-xs-6.col-md-5 > span.bold")
                  .text()
                  .trim();
                const price = $(el)
                  .find(".col-xs-3.col-md-2 > span.bold")
                  .text()
                  .trim();
                const allergens = $(el).find(".kennz").text().trim();
                const ampel = $(el)
                  .find(".splIcon.shocl[alt*=Ampelpunkt]")
                  .next()
                  .attr("aria-describedby");
                const h2p = $(el)
                  .find(".splIcon.shocl[alt*=H2P]")
                  .next()
                  .attr("aria-describedby");
                const co2 = $(el)
                  .find(".splIcon.shocl[alt*=CO2-Bewertung]")
                  .next()
                  .attr("aria-describedby");

                dishes.push({ name, price, allergens, ampel, h2p, co2 });
              });

            menuMap.set(category, dishes);
          });
        })
        .catch((error) => {
          console.log(error);
        });

      console.log(menuMap);
      const speisekarte = new EmbedBuilder()
        .setTitle(`__Speiseplan__`)
        .setColor("#00ff00")
        .setDescription("Menü für heute")
        .setTimestamp();

      menuMap.forEach((meals, category) => {
        const mealStrings = meals
          .map(
            (meal) => `${meal.name} - ${meal.price}`
            //`**${meal.name}** - ${meal.price}\n${meal.description}\n_Last offered: ${meal.lastOffered}_`
          )
          .join("\n\n");

        speisekarte.addFields({ name: " ", value: `**${category}**` });
        speisekarte.addFields({ name: " ", value: mealStrings });
      });

      await interaction.reply({ embeds: [speisekarte] });
    } catch (error) {
      console.error(error);
      await interaction.reply("ERROR ERROR, siehe console");
    }
  },
};
