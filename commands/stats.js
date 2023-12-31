const { Favorite, getMostFavoritedDishes } = require("../models/Favorite.js");
const Dish = require("../models/Dish.js");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("stats").setDescription("Statistiken"),
  async execute(interaction) {
    try {
      fav = await getMostFavoritedDishes();
      console.log(fav);
      let favArray = [];
      for (const f of fav) {
        let dish = await Dish.findOne({ _id: f._id });
        if (!dish) continue;
        favArray.push({ name: dish.name, quant: f.totalQuantity });
      }
      let content = favArray.map((f) => `${f.name}: ${f.quant}`).join("\n");

      await interaction.reply({
        content: "favs:\n" + content,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply("Es gab einen Fehler beim Anzeigen der Statistiken.");
    }
  },
};
