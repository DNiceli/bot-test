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

    // Since createDishPictureDalle is an async function, you need to await its result
    const pictureUrl = await createDishPictureDalle(dishName);

    console.log("pictureUrldata0url", pictureUrl.data[0].url);
    const embed = new EmbedBuilder()
      .setTitle("Generated Picture")
      .setImage(pictureUrl.data[0].url);

    // Create an embed and set the image to the picture URL
    await interaction.editReply({
      content: "Image:",
      embeds: [embed],
    });
  },
};
