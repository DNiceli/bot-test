require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const { getWeekMenu } = require('../util/dish-menu-service.js');
const { generateMenuImage } = require('../util/speiseplan-util.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('speiseplan3')
    .setDescription('sieht speiseplan multi dishcards'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const weekMenu = await getWeekMenu(
        new Date().toISOString().split('T')[0],
      );
      const img = await generateMenuImage(weekMenu);
      await interaction.editReply({ files: [img] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('Es gab einen Fehler bei der Ausführung.');
    }
  },
};
