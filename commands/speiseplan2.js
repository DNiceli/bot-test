const { SlashCommandBuilder } = require('discord.js');
const Favorite = require('../models/Favorite.js');
const { generateMenuCard } = require('../util/speiseplan-util.js');
const { getTodaysMenu } = require('../util/dish-menu-service.js');
const User = require('../models/User.js');
const arrowLeft = '\u2B05';
const arrowRight = '\u27A1';
const star = '\u2b50';
const categoryEmojis = {
  Vorspeisen: '\uD83C\uDF4F',
  Salate: '\uD83E\uDD57',
  Essen: '\uD83C\uDF5B',
  Desserts: '\uD83C\uDF70',
  Suppen: '\uD83C\uDF5C',
  Aktionen: '\uD83D\uDC51',
  Beilagen: '\uD83C\uDF5A',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('speiseplan2')
    .setDescription('sieht speiseplan in dishcard mit buttons'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const userAllergens = await findOrCreateUserAllergens(interaction);

      const menuImgs = {
        Vorspeisen: [],
        Salate: [],
        Essen: [],
        Desserts: [],
        Suppen: [],
        Aktionen: [],
        Beilagen: [],
      };

      let dailyMenu;
      try {
        dailyMenu = await getTodaysMenu();
      }
 catch (error) {
        console.error(error);
        await interaction.editReply('Es ist kein Menü für heute vorhanden.');
      }

      await populateMenuImgs(dailyMenu, userAllergens, menuImgs);

      let currentCategory;
      const reply = await displayMenuImage(
        interaction,
        menuImgs,
        currentCategory,
      );

      for (const category of Object.keys(menuImgs)) {
        console.log(category);
        await reply.react(categoryEmojis[category]);
      }

      await reply.react(arrowLeft);
      await reply.react(arrowRight);
      await reply.react(star);

      // Create the message collector to listen for reactions of users
      const filter = (reaction, user) => user.id === interaction.user.id;
      const collector = reply.createReactionCollector({
        filter,
        time: 60000,
      });

      let currentIndex = 0;

      collector.on('collect', async (reaction, user) => {
        const reactedEmoji = reaction.emoji.name;
        const selectedCategory = Object.keys(categoryEmojis).find(
          (category) => categoryEmojis[category] === reactedEmoji,
        );

        switch (reactedEmoji) {
          case arrowLeft: {
            currentIndex =
              (currentIndex + 1) % menuImgs[currentCategory].length;
            break;
          }
          case arrowRight: {
            currentIndex =
              (currentIndex + 1) % menuImgs[currentCategory].length;
            break;
          }
          case star: {
            if (!interaction.guild) return;
            const dishId = menuImgs[currentCategory][currentIndex].id;
            const guild = interaction.guild.id;
            const userID = user.id;
            Favorite.createOrUpdateFavorite(userID, guild, dishId);
            break;
          }
          default: {
            currentCategory = selectedCategory;
            currentIndex = 0;
          }
        }
        const dish = menuImgs[currentCategory][currentIndex];
        if (!dish) {
          console.log('No dish found');
        }
 else {
          const newImg = dish.image;
          await reply.edit({
            content: 'Here\'s the menu card:',
            files: [newImg],
          });
        }
        await reaction.users.remove(interaction.user.id);
      });

      collector.on('end', () => {
        // Remove reactions when the collector ends
        reply.reactions.removeAll();
        reply.delete();
      });
    }
 catch (error) {
      console.error(error);
      await interaction.editReply('Es gab einen Fehler bei der Ausführung.');
    }
  },
};

async function populateMenuImgs(dailyMenu, userAllergens, menuImgs) {
  for (const dish of dailyMenu) {
    const shouldSkipDish =
      userAllergens?.length > 0 &&
      dish.allergens?.length > 0 &&
      userAllergens.some((userAllergen) =>
        dish.allergens.find(
          (dishAllergen) => dishAllergen.number === userAllergen.number,
        ),
      );
    if (shouldSkipDish) {
      continue;
    }
    const dishImgObj = await generateMenuCard(dish);
    menuImgs[dishImgObj.category].push(dishImgObj);
  }
}

async function findOrCreateUserAllergens(interaction) {
  let userAllergens = [];
  let user = await User.findOne({ userId: interaction.user.id });
  if (!user) {
    user = new User({
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guild.id,
      allergens: [],
    });
    await user.save();
  }
 else {
    userAllergens = user.allergens;
  }
  return userAllergens;
}

async function displayMenuImage(interaction, menuImgs, currentCategory) {
  for (const category in menuImgs) {
    if (menuImgs[category].length > 0) {
      currentCategory = category;
      break;
    }
  }
  if (currentCategory) {
    const img = menuImgs[currentCategory][0].image;
    const reply = await interaction.editReply({
      content: 'Here\'s the menu card:',
      files: [img],
    });

    return reply;
  }
 else {
    const reply = await interaction.editReply({
      content: 'Es gibt kein passendes Gericht zu deinem Filter.',
    });
    return reply;
  }
}
