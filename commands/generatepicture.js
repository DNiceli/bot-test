const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const {
  createDishPictureDalle,
  uploadImage,
} = require("../util/image-creation-service");
require("dotenv").config();

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

    cloudinary.config({
      secure: true,
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });

    console.log(cloudinary.config());

    const pictureUrl = await createDishPictureDalle(dishName);

    uploadImage(pictureUrl);

    const embed = new EmbedBuilder()
      .setTitle("Generated Picture")
      .setImage(pictureUrl);

    await interaction.editReply({
      content: "Image:",
      embeds: [embed],
    });
  },
};
