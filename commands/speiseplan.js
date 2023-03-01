const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Speisekarte } = require("./dbObjects.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan")
    .setDescription("sieht speiseplan mensadaten"),
  async execute(interaction) {
    try {
      const url =
        "https://www.imensa.de/berlin/mensa-luxemburger-strasse/index.html";
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const menuItems = [];

      $(".aw-meal").each(function () {
        var name = $(this).find(".aw-meal-description").text();
        var description = $(this)
          .find(".aw-meal-attributes span:first-child")
          .text();
        var price = $(this).find(".aw-meal-price").text();

        menuItems.push({ name, description, price });
      });

      const speisekrate = new EmbedBuilder()
        .setTitle("Speiseplan")
        .setColor("#00ff00")
        .setDescription("Menü für heute")
        .setTimestamp();
      menuItems.forEach((item) => {
        speisekrate.addFields({ name: item.name, value: item.price });
      });

      await interaction.reply({ embeds: [speisekrate] });
    } catch (error) {
      console.error(error);
      await interaction.reply("ERROR ERROR, siehe console");
    }
  },
};
