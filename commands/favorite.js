require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const { Favorite } = require('../models/Favorite.js');
const { Dish } = require('../models/Dish.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Markiert ein Gericht als Favorit')
    .addStringOption((option) =>
      option
        .setName('dish_id')
        .setDescription('Die ID des Gerichts, das du favorisieren möchtest')
        .setRequired(true),
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const dishId = interaction.options.getString('dish_id');
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      const dishExists = await Dish.findOne({ id: dishId });
      if (!dishExists) {
        await interaction.editReply('Gericht nicht gefunden.');
        return;
      }

      const existingFavorite = await Favorite.findOne({ userId, dishId });
      if (existingFavorite) {
        await interaction.editReply(
          'Du hast dieses Gericht bereits favorisiert.',
        );
        return;
      }

      await Favorite.create({ userId, dishId, guildId });

      await interaction.editReply(
        `Gericht ${dishExists.name} wurde zu deinen Favoriten hinzugefügt.`,
      );
    }
 catch (error) {
      console.error(error);
      await interaction.editReply(
        'Es gab einen Fehler beim Favorisieren des Gerichts.',
      );
    }
  },
};
