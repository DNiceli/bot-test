const Rating = require('../models/Rating.js');
const Dish = require('../models/Dish.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ratings')
    .setDescription('Zeigt deine Bewertungen an.'),
  async execute(interaction) {
    try {
      const ratings = await Rating.findRatingsForUser(interaction.user.id);
      if (!ratings || ratings.length === 0) {
        await interaction.reply({
          content: 'Du hast noch keine Bewertungen abgegeben.',
          ephemeral: true,
        });
        return;
      }
      const rateArray = [];
      let response = 'Deine Bewertungen:\n';
      for (const rating of ratings) {
        const dish = await Dish.findOne({ _id: rating.dishId });
        if (!dish) continue;
        response += `${dish.name} - ${rating.score} / 5\n`;
        rateArray.push(dish.name, rating.score, rating.comment);
      }

      await interaction.reply({
        content: response,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        'Es gab einen Fehler beim Anzeigen der Statistiken.',
      );
    }
  },
};
