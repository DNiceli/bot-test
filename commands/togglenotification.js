require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const Notification = require('../models/Notification.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toggle-notification')
    .setDescription('Benachrichtigungen aktivieren/deaktivieren'),
  async execute(interaction) {
    try {
      const userid = interaction.user.id;
      let notification = await Notification.findOne({ userId: userid });
      if (!notification) {
        notification = await Notification.create({
          userId: userid,
          notification: true,
        });
        interaction.reply('Notifications enabled');
      } else if (notification.notification === false) {
        notification.notification = true;
        await notification.save();
        interaction.reply('Notifications enabled');
      } else {
        notification.notification = false;
        await notification.save();
        interaction.reply('Notifications disabled');
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        'Es gab einen Fehler beim Aktivieren der Benachrichtigungen.',
      );
    }
  },
};
