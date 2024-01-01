const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Favorite = require("../models/Favorite.js");
const { generateMenuCard } = require("../util/speiseplan-util.js");
const { getTodaysMenu } = require("../util/dish-menu-service.js");
const User = require("../models/User.js");
const Rating = require("../models/Rating.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speiseplan")
    .setDescription("sieht speiseplan in dishcard mit buttons"),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      let userAllergens = await findOrCreateUserAllergens(interaction);

      let menuImgs = [];

      let dailyMenu;
      try {
        dailyMenu = await getTodaysMenu();
      } catch (error) {
        console.error(error);
        await interaction.editReply("Es ist kein Menü für heute vorhanden.");
      }

      await populateMenuImgs(dailyMenu, userAllergens, menuImgs); //menuImgs is a map with dish as key and array of images as value

      const components = createDishSelectMenu(menuImgs); //create select menus for each dish

      response = await interaction.editReply({
        content: "Adjust the settings here:",
        components: components,
        fetchReply: true,
        ephemeral: true,
      });

      const collector = response.createMessageComponentCollector({
        filter: (i) =>
          (i.componentType === ComponentType.Button ||
            i.componentType === ComponentType.StringSelect ||
            i.componentType === ComponentType.Modal) &&
          i.user.id === interaction.user.id,
        time: 300_000, // Reduced time to 5 minutes
      });
      let currentDish;
      collector.on("collect", async (i) => {
        if (i.isStringSelectMenu()) {
          currentDish = i.values[0];
          let img = menuImgs.find((dish) => dish.name === currentDish).image;
          await interaction.editReply({ content: "You selected " + currentDish, files: [img] });
          console.log(currentDish);
          await i.deferUpdate();
        } else if (i.isButton()) {
          switch (i.customId) {
            case "submit":
              await i.deferUpdate();
              console.log("sub");
              break;
            case "favorite":
              if (!i.guild) return; // Returns as there is no guild
              if (!currentDish) return;
              var dishId = menuImgs.find((dish) => dish.name === currentDish).id;
              var guild = i.guild.id;
              var userID = i.user.id;
              let bool = await Favorite.createOrUpdateFavorite(userID, guild, dishId);
              if (bool) {
                interaction.editReply({ content: "Added to favorites: " + currentDish });
              } else {
                interaction.editReply({ content: "Already in favorites: " + currentDish });
              }
              console.log("fav");
              await i.deferUpdate();
              break;
            case "rate":
              if (!currentDish) return;
              let dishname = menuImgs.find((dish) => dish.name === currentDish).name;
              let modal = createRateModal(dishname);
              await i.showModal(modal);
              const submission = await i.awaitModalSubmit({ time: 60_000 });
              if (!submission) {
                submission.update({ content: "You did not provide a rating" });
                break;
              } else if (submission.isModalSubmit()) {
                if (!submission.components[0].components[0].value) {
                  await submission.update({ content: "Please enter a value between 1 and 5" });
                  break;
                }
                if (
                  isNaN(submission.components[0].components[0].value) ||
                  submission.components[0].components[0].value > 5 ||
                  submission.components[0].components[0].value < 1
                ) {
                  await submission.update({ content: "Please enter a value between 1 and 5" });
                  break;
                }
                const ratingValue = submission.components[0].components[0].value;
                const userId = submission.user.id;
                const dishId = menuImgs.find((dish) => dish.name === currentDish).id;
                await Rating.create({ userId, dishId, score: ratingValue });
                await submission.update({
                  content: "You rated " + currentDish + " withhhh " + ratingValue,
                });
              }
              console.log(submission.components[0].components[0].value);
              break;
            case "close":
              console.log("close");
              await i.deferUpdate();
              break;
          }
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply("Es gab einen Fehler bei der Ausführung.");
    }
  },
};

function createRateModal(dishname) {
  const modal = new ModalBuilder().setCustomId("rate").setTitle(dishname);
  const rateInput = new TextInputBuilder()
    .setCustomId("rate")
    .setLabel("Wie würdest du das Gericht bewerten?")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(1)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(rateInput);
  modal.addComponents(firstActionRow);
  return modal;
}

async function populateMenuImgs(dailyMenu, userAllergens, menuImgs) {
  for (const dish of dailyMenu) {
    const shouldSkipDish =
      userAllergens?.length > 0 &&
      dish.allergens?.length > 0 &&
      userAllergens.some((userAllergen) =>
        dish.allergens.find((dishAllergen) => dishAllergen.number === userAllergen.number)
      );
    if (shouldSkipDish) {
      continue;
    }
    let dishImgObj = await generateMenuCard(dish);
    menuImgs.push(dishImgObj);
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
  } else {
    userAllergens = user.allergens;
  }
  return userAllergens;
}

function createDishSelectMenu(menuImgs) {
  const components = [];
  let selectMenu = new StringSelectMenuBuilder()
    .setCustomId("dishes")
    .setPlaceholder("Choose a dish");

  for (let dish of menuImgs) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(dish.name)
      .setDescription(dish.category)
      .setValue(dish.name);
    selectMenu.addOptions(option);
  }

  components.push(new ActionRowBuilder().addComponents(selectMenu));

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("submit").setLabel("Submit").setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("favorite")
      .setLabel("Favorite")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("rate").setLabel("Rate").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Secondary)
  );
  components.push(buttonRow);
  return components;
}
