require("dotenv").config();
const { SlashCommandBuilder } = require("discord.js");
const Favorite = require("../models/Favorite.js");
const Menu = require("../models/Dailymenu.js");
const { generateMenuCard } = require("../util/speiseplan-util.js");

const star = "\u2b50";

const categoryEmojis = {
  Vorspeisen: "\uD83C\uDF4F",
  Salate: "\uD83E\uDD57",
  Essen: "\uD83C\uDF5B",
  Desserts: "\uD83C\uDF70",
  Suppen: "\uD83C\uDF5C",
  Aktionen: "\uD83D\uDC51",
  Beilagen: "\uD83C\uDF5A",
};

let menuImgs = {
  Vorspeisen: [],
  Salate: [],
  Essen: [],
  Desserts: [],
  Suppen: [],
  Aktionen: [],
  Beilagen: [],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan3")
    .setDescription("sieht speiseplan multi dishcards"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      let today = new Date().toISOString().split("T")[0];
      if (process.env.OVERRIDE_DATE === "true") {
        today = "2023-12-20";
      }
      let dailyMenu = await Menu.findOne({ date: today });
      if (!dailyMenu) {
        await interaction.editReply("No menu found for today");
      } else {
        dailyMenu = await dailyMenu.populate("dishes");

        for (const dish of dailyMenu.dishes) {
          let dishImgObj = await generateMenuCard(dish);
          menuImgs[dishImgObj.category].push(dishImgObj);
        }

        const message = await interaction.editReply({
          content: "Here's the menu card:",
          files: [menuImgs["Desserts"][0].image], // Default to showing first dessert
        });

        for (const category of Object.keys(menuImgs)) {
          await message.react(categoryEmojis[category]);
        }

        await message.react(star);

        const filter = (reaction, user) => user.id === interaction.user.id;
        const collector = message.createReactionCollector({
          filter,
          time: 60000,
        });

        let currentCategory = "Desserts";

        collector.on("collect", async (reaction, user) => {
          const reactedEmoji = reaction.emoji.name;
          const selectedCategory = Object.keys(categoryEmojis).find(
            (category) => categoryEmojis[category] === reactedEmoji
          );

          if (selectedCategory && menuImgs[selectedCategory].length > 0) {
            currentCategory = selectedCategory;
            const categoryImages = menuImgs[currentCategory].map(
              (dish) => dish.image
            );
            await message.edit({
              content: `Here's the menu for ${currentCategory}:`,
              files: categoryImages,
            });
          } else if (reactedEmoji === star) {
            // Logic for adding a dish to favorites
            if (!interaction.guild) return;
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const dishId = menuImgs[currentCategory][0].id; // TODO: Default is first image, bessere Lösung?
            Favorite.createOrUpdateFavorite(guildId, userId, dishId);
          }
          await reaction.users.remove(interaction.user.id);
        });

        collector.on("end", () => {
          message.reactions.removeAll();
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply("Es gab einen Fehler bei der Ausführung.");
    }
  },
};
