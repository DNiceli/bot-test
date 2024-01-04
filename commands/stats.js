const { getMostFavoritedDishes } = require('../models/Favorite.js');
const Dish = require('../models/Dish.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Statistiken'),
  async execute(interaction) {
    try {
      const fav = await getMostFavoritedDishes();
      console.log(fav);
      const favArray = [];
      for (const f of fav) {
        const dish = await Dish.findOne({ _id: f._id });
        if (!dish) continue;
        favArray.push({ name: dish.name, quant: f.totalQuantity });
      }
      const content = favArray.map((f) => `${f.name}: ${f.quant}`).join('\n');

      await interaction.reply({
        content: 'favs:\n' + content,
        ephemeral: true,
      });
    }
 catch (error) {
      console.error(error);
      await interaction.editReply(
        'Es gab einen Fehler beim Anzeigen der Statistiken.',
      );
    }
  },
};
