require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan")
    .setDescription("sieht speiseplan mensadaten"),
  async execute(interaction) {
    try {
      const url = process.env.mensaUrl;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      console.log($.html());

      const categories = $(".aw-meal-category");

      const mealsByCategory = {};

      categories.each(function () {
        const categoryName = $(this).find(".aw-meal-category-name").text();

        const meals = $(this).find(".aw-meal");

        meals.each(function () {
          const mealName = $(this).find(".aw-meal-description").text();
          const mealDescription = $(this).find(".aw-meal-attributes").text();

          const lastOffered = $(this).find(".aw-meal-last").text();

          const mealPrice = $(this).find(".aw-meal-price").text();

          if (!mealsByCategory[categoryName]) {
            mealsByCategory[categoryName] = [];
          }

          mealsByCategory[categoryName].push({
            name: mealName,
            description: mealDescription,
            lastOffered: lastOffered,
            price: mealPrice,
          });
        });
      });

      const speisekarte = new EmbedBuilder()
        .setTitle(`__Speiseplan__`)
        .setColor("#00ff00")
        .setDescription("Menü für heute")
        .setTimestamp();

      for (const category in mealsByCategory) {
        const meals = mealsByCategory[category];

        const mealStrings = meals
          .map(
            (meal) => `${meal.name} - ${meal.price}`
            //`**${meal.name}** - ${meal.price}\n${meal.description}\n_Last offered: ${meal.lastOffered}_`
          )
          .join("\n\n");

        speisekarte.addFields({ name: " ", value: `**${category}**` });
        speisekarte.addFields({ name: " ", value: mealStrings });
      }

      await interaction.reply({ embeds: [speisekarte] });
    } catch (error) {
      console.error(error);
      await interaction.reply("ERROR ERROR, siehe console");
    }
  },
};
