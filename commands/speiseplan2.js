require("dotenv").config();
const { SlashCommandBuilder } = require("discord.js");
const Favorite = require("../models/Favorite.js");
const Menu = require("../models/Dailymenu.js");
const { generateMenuCard } = require("../util/speiseplan-util.js");

const arrowLeft = "\u2B05";
const arrowRight = "\u27A1";
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
    .setName("speiseplan2")
    .setDescription("sieht speiseplan in dishcard mit buttons"),
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

        let img = menuImgs["Desserts"][0].image;
        const message = await interaction.editReply({
          content: "Here's the menu card:",
          files: [img],
        });

        for (const category of Object.keys(menuImgs)) {
          console.log(category);
          await message.react(categoryEmojis[category]);
        }

        await message.react(arrowLeft);
        await message.react(arrowRight);
        await message.react(star);

        // Create the message collector to listen for reactions of users
        const filter = (reaction, user) => user.id === interaction.user.id;
        const collector = message.createReactionCollector({
          filter,
          time: 60000,
        });

        let currentCategory = "Desserts";
        let currentIndex = 0;

        collector.on("collect", async (reaction, user) => {
          const reactedEmoji = reaction.emoji.name;
          const selectedCategory = Object.keys(categoryEmojis).find(
            (category) => categoryEmojis[category] === reactedEmoji
          );
          if (selectedCategory) {
            currentCategory = selectedCategory;
            currentIndex = 0;
          } else if (reactedEmoji === arrowLeft) {
            currentIndex =
              (currentIndex - 1 + menuImgs[currentCategory].length) %
              menuImgs[currentCategory].length;
          } else if (reactedEmoji === arrowRight) {
            currentIndex =
              (currentIndex + 1) % menuImgs[currentCategory].length;
          } else if (reactedEmoji === star) {
            if (!interaction.guild) return; // Returns as there is no guild
            var dishId = menuImgs[currentCategory][currentIndex].id;
            var guild = interaction.guild.id;
            var userID = interaction.user.id;
            Favorite.createOrUpdateFavorite(userID, guild, dishId);
          }
          const dish = menuImgs[currentCategory][currentIndex];
          if (!dish) {
            console.log("No dish found");
          } else {
            const newImg = dish.image;
            await message.edit({
              content: "Here's the menu card:",
              files: [newImg],
            });
          }
          await reaction.users.remove(interaction.user.id);
        });

        collector.on("end", () => {
          // Remove reactions when the collector ends
          message.reactions.removeAll();
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply("ERROR ERROR, siehe console");
    }
  },
};
