const { SlashCommandBuilder } = require("discord.js");
const Menu = require("../util/dish-menu-service.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fetch-gerichte-and-save")
    .setDescription("speichert gerichte in der Datenbank"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const menu = await fetchAndSaveDishes();

      const message = await interaction.editReply({
        content: "Done:",
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply("ERROR ERROR, siehe console");
    }
  },
};
