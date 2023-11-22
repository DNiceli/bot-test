require("dotenv").config();
const { SlashCommandBuilder } = require("discord.js");
const Rating = require("../models/Rating.js");
const Dish = require("../models/Dish.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rate")
    .setDescription("Bewertet ein Gericht")
    .addStringOption((option) =>
      option
        .setName("dish_id")
        .setDescription("Die ID des Gerichts, das du bewerten möchtest")
        .setRequired(true)
    )
    .addIntegerOption(
      (option) =>
        option
          .setName("rating")
          .setDescription("Deine Bewertung für das Gericht (1-5)")
          .setRequired(true)
      // Remove addChoice here and use addIntegerChoices if needed
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const dishId = interaction.options.getString("dish_id");
      const ratingValue = interaction.options.getInteger("rating");
      const userId = interaction.user.id;

      // Überprüfe, ob das Gericht existiert
      const dishExists = await Dish.findOne({ id: dish.id });
      if (!dishExists) {
        await interaction.editReply("Gericht nicht gefunden.");
        return;
      }

      // Erstelle eine neue Bewertung
      await Rating.create({ userId, dishId, score: ratingValue });

      await interaction.editReply(
        `Du hast das Gericht ${dishExists.name} mit ${ratingValue} Sternen bewertet.`
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "Es gab einen Fehler beim Bewerten des Gerichts."
      );
    }
  },
};
