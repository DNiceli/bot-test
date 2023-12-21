require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTodaysMenu } = require("../util/dish-menu-service");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan")
    .setDescription("sieht speiseplan mensadaten"),
  async execute(interaction) {
    const channel = interaction.channel;
    const dishes = await getTodaysMenu();

    for (const dish of dishes) {
      let embed = await createDishEmbed(dish);
      channel.send({ embeds: [embed] });
    }
  },
};

async function createDishEmbed(dish) {
  await dish.populate("imageId");
  const embed = new EmbedBuilder()
    .setTitle(dish.name)
    .setDescription(`Category: ${dish.category}\nPrice: ${dish.price}`)
    .addFields(
      { name: "Allergens", value: dish.allergens || "k.A.", inline: true },
      { name: "CO2 Emissions", value: dish.co2 || "k.A.", inline: true },
      { name: "Water Usage", value: dish.h2o || "k.A.", inline: true },
      { name: "Nutritional Score", value: dish.ampel || "k.A.", inline: true }
    )
    .setColor("#0099ff")
    .setImage(dish.imageId.url);

  console.log(embed);

  return embed;
}
