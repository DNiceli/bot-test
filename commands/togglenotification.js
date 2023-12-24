require("dotenv").config();
const { SlashCommandBuilder } = require("discord.js");
const Notification = require("../models/Notification.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toggle-notification")
    .setDescription("Enable / Disable Dish Notifications"),
  async execute(interaction) {
    const userid = interaction.user.id;
    let notification = await Notification.findOne({ userId: userid });
    if (!notification) {
      notification = await Notification.create({
        userId: userid,
        notification: false,
      });
      interaction.reply("Notifications created + enabled");
    } else if (notification.notification === false) {
      notification.notification = true;
      await notification.save();
      interaction.reply("Notifications enabled");
    } else {
      notification.notification = false;
      await notification.save();
      interaction.reply("Notifications disabled");
    }
  },
};
