require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const { getFavorites } = require('../models/Favorite.js');
const { Dish } = require('../models/Dish.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('get-favorites')
    .setDescription('Zeigt deine Lieblingsgerichte an'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      const favorites = await getFavorites(userId, guildId);
      if (!favorites) {
        await interaction.editReply('Du hast noch keine Gerichte favorisiert.');
        return;
      } else {
        const favoriteDishes = await getFavoriteDishes(favorites);

        const favoriteDishesToStringSeparatedByComma =
          favoriteDishes.join(', ');

        interaction.user.send(
          'Deine Lieblingsgerichte: ' + favoriteDishesToStringSeparatedByComma,
        );

        await interaction.editReply({
          content:
            'Deine Lieblingsgerichte: ' +
            favoriteDishesToStringSeparatedByComma,
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        'Es gab einen Fehler beim Favorisieren des Gerichts.',
      );
    }
  },
};

async function getFavoriteDishes(favorites) {
  const favoriteDishes = [];
  for (const favorite of favorites) {
    const dish = await Dish.findOne({ id: favorite.dishId });
    if (dish) {
      favoriteDishes.push(dish.name);
    }
  }
  return favoriteDishes;
}
