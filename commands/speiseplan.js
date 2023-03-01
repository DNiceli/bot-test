const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

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

      $(".aw-meal").each(function () {
        var name = $(this).find(".aw-meal-description").text();
        var description = $(this)
          .find(".aw-meal-attributes span:first-child")
          .text();
        var price = $(this).find(".aw-meal-price").text();
        console.log(
          "Name: " +
            name +
            ", Description: " +
            description +
            ", Price: " +
            price
        );
      });
    } catch (error) {
      console.error(error);
      await interaction.reply("ERROR ERROR, siehe console");
    }

    await interaction.reply("All Gucci");
  },
};
