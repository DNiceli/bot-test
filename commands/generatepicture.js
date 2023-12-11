const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { createDishPictureDalle } = require("../util/util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("generatepicture")
    .setDescription("Generate a dish picture")
    .addStringOption((option) =>
      option
        .setName("dish")
        .setDescription("The name of the dish")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const dishName = interaction.options.getString("dish");

    const pictureUrl = await createDishPictureDalle(dishName);

    const embed = new EmbedBuilder()
      .setTitle("Generated Picture")
      .setImage(pictureUrl);

    await interaction.editReply({
      content: "Image:",
      embeds: [embed],
    });
  },
};
