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
  EmbedBuilder,
} = require('discord.js');
const Favorite = require('../models/Favorite.js');
const {
  getTodaysMenu,
  updateRatingOnDish,
  updateFavoritesOnDish,
  updateDishCard,
} = require('../util/dish-menu-service.js');
const User = require('../models/User.js');
const Rating = require('../models/Rating.js');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('speiseplan')
    .setDescription(
      'Zeigt den Speiseplan an. Benutzt den /filter um Allergene zu Filtern. Parameter sind Optional.',
    )
    .addStringOption((option) =>
      option
        .setName('woche')
        .setDescription('Woche')
        .setRequired(false)
        .addChoices(
          { name: 'Diese Woche', value: '1' },
          { name: 'Nächste Woche', value: '2' },
          { name: 'Letzte Woche', value: '3' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('wochentag')
        .setDescription('Wochentag')
        .setRequired(false)
        .addChoices(
          { name: 'Sonntag', value: '0' },
          { name: 'Montag', value: '1' },
          { name: 'Dienstag', value: '2' },
          { name: 'Mittwoch', value: '3' },
          { name: 'Donnerstag', value: '4' },
          { name: 'Feitag', value: '5' },
          { name: 'Samstag', value: '6' },
        ),
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const woche = interaction.options.getString('woche');
      const wochentag = parseInt(
        interaction.options.getString('wochentag'),
        10,
      );
      let date = new Date().toISOString().split('T')[0];
      if (woche && !wochentag) {
        return await interaction.editReply(
          'Bitte gib eine Woche und einen Wochentag an.',
        );
      }
      if (!woche && wochentag) {
        date = getDateForWeekday('1', wochentag);
      } else if (woche && wochentag) {
        date = getDateForWeekday(woche, wochentag);
      }
      let dailyMenu;
      try {
        dailyMenu = await getTodaysMenu(date);
      } catch (error) {
        console.error(error);
        await interaction.editReply(
          `Es ist kein Menü für das Datum ${date} vorhanden.`,
        );
      }
      const userAllergens = await findOrCreateUserAllergens(interaction);
      const menuImgs = [];
      // console.log(dailyMenu.map((dish) => dish.name).join(", "));           possibly openAi keyword generation for dishes to generate recommendations

      await populateMenuImgs(dailyMenu, userAllergens, menuImgs);
      sizeOf(menuImgs);
      const components = createDishSelectMenu(menuImgs);

      const dishEmbed = createDishListEmbed(menuImgs);

      const response = await interaction.editReply({
        content: 'Adjust the settings here:',
        components: components,
        fetchReply: true,
        ephemeral: true,
        embeds: [dishEmbed],
      });

      const collector = response.createMessageComponentCollector({
        filter: (i) =>
          (i.componentType === ComponentType.Button ||
            i.componentType === ComponentType.StringSelect ||
            i.componentType === ComponentType.Modal) &&
          i.user.id === interaction.user.id,
        time: 300_000,
      });

      let currentDish;
      collector.on('collect', async (i) => {
        if (i.isStringSelectMenu()) {
          currentDish = i.values[0];
          const dishObj = menuImgs.find((dish) => dish.name === currentDish);
          console.log(dishObj);
          const img = dishObj.dishCard;
          let content = 'Du hast gewählt ' + currentDish;
          console.log(dishObj.rating);
          console.log(dishObj.favorites);
          if (parseFloat(dishObj.rating)) {
            content = content + ' avg Rating: ' + dishObj.rating;
          }
          if (dishObj.favorite) {
            content = content + ' Favs: ' + dishObj.favorite;
          }
          await i.update({
            content: content,
            files: [img],
          });
        } else if (i.isButton()) {
          switch (i.customId) {
            case 'close':
              await interaction.deleteReply();
              collector.stop();
              break;
            case 'favorite': {
              if (!i.guild) return;
              if (!currentDish) {
                await i.update('You didn\'t choose a dish yet.');
                // TODO: Tell User to choose Dish first
                return;
              }
              let dishObj = menuImgs.find((dish) => dish.name === currentDish);
              const currentDishId = dishObj._id;
              const guild = i.guild.id;
              const userID = i.user.id;
              const bool = await Favorite.createOrUpdateFavorite(
                userID,
                guild,
                currentDishId,
              );
              if (bool) {
                interaction.editReply({
                  content: 'Added to favorites: ' + currentDish,
                });
                dishObj = await updateFavoritesOnDish(dishObj);
                if (process.env.UPDATE_DC_SP_TOGGLE === 'true') {
                  updateDishCard(dishObj);
                }
              } else {
                interaction.editReply({
                  content: 'Already in favorites: ' + currentDish,
                });
              }
              await i.deferUpdate();
              break;
            }
            case 'rate': {
              if (!currentDish) {
                await i.deferUpdate();
                // TODO: Tell User to choose Dish first
                return;
              }
              const dishObj = menuImgs.find(
                (dish) => dish.name === currentDish,
              );
              const modal = createRateModal(dishObj.name);
              // problem: dishname is undefined
              await i.showModal(modal);
              const submission = await i.awaitModalSubmit({ time: 60_000 });
              await handleSubmission(submission, dishObj);
              break;
            }
            case 'diet': {
              let filteredMenuImgs = menuImgs;
              console.log(filteredMenuImgs);
              const rows = i.message.components;
              let button = rows[1].components.find(
                (c) => c.customId === 'diet',
              );
              console.log(button.toJSON());
              if (button.label === 'Diet Typ') {
                console.log('shouldwork');
                button = new ButtonBuilder()
                  .setCustomId('diet')
                  .setLabel('Vegetarisch')
                  .setStyle(ButtonStyle.Primary);
                filteredMenuImgs = filteredMenuImgs.filter(
                  (dish) =>
                    dish.dietType === 'vegetarisch' || dish.dietType === 'vegan',
                );
              } else if (button.label === 'Vegetarisch') {
                button = new ButtonBuilder()
                  .setCustomId('diet')
                  .setLabel('Vegan')
                  .setStyle(ButtonStyle.Primary);
                filteredMenuImgs = filteredMenuImgs.filter(
                  (dish) => dish.dietType === 'vegan',
                );
              } else {
                button = new ButtonBuilder()
                  .setCustomId('diet')
                  .setLabel('Diet Typ')
                  .setStyle(ButtonStyle.Secondary);
              }
              console.log(button.toJSON());
              const newComponents = createDishSelectMenu(filteredMenuImgs);
              newComponents[1].components[3] = button;
              const newEmbed = createDishListEmbed(filteredMenuImgs);
              await i.update({ components: newComponents, embeds: [newEmbed] });
              break;
            }
          }
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply('Es gab einen Fehler bei der Ausführung.');
    }
  },
};

function createDishListEmbed(menuImgs) {
  const categoryMap = new Map();
  menuImgs.forEach((dish) => {
    if (!categoryMap.has(dish.category)) {
      categoryMap.set(dish.category, []);
    }
    categoryMap.get(dish.category).push(dish.name);
  });
  const embed = new EmbedBuilder().setColor(0x0099ff).setTitle('Speisekarte');
  // .setThumbnail('') Botbild adden

  categoryMap.forEach((dishes, category) => {
    if (category === 'Beilagen') {
      embed.addFields({ name: category, value: dishes.join(', ') });
    } else {
      embed.addFields({ name: category, value: dishes.join('\n') });
    }
  });
  return embed;
}

function sizeOf(menuImgs) {
  const size = Buffer.byteLength(JSON.stringify(menuImgs));
  const kiloBytes = size / 1024;
  const megaBytes = kiloBytes / 1024;
  console.log(`Size of MenuImage: ${megaBytes} MB`);
  console.log(`Size of MenuImage: ${kiloBytes} KB`);
}

async function handleSubmission(submission, dish) {
  if (!submission) {
    submission.update({ content: 'You did not provide a rating' });
  } else if (submission.isModalSubmit()) {
    if (!submission.components[0].components[0].value) {
      await submission.update({
        content: 'Please enter a value between 1 and 5',
      });
      return;
    }
    if (
      isNaN(submission.components[0].components[0].value) ||
      submission.components[0].components[0].value > 5 ||
      submission.components[0].components[0].value < 1
    ) {
      await submission.update({
        content: 'Please enter a value between 1 and 5',
      });
      return;
    }
    const ratingValue = submission.components[0].components[0].value;
    const ratingComment = submission.components[1].components[0].value;
    const userId = submission.user.id;
    await Rating.createOrUpdateRating(
      userId,
      dish._id,
      ratingValue,
      ratingComment,
    );
    dish = await updateRatingOnDish(dish);
    if (process.env.UPDATE_DC_SP_TOGGLE === 'true') {
      updateDishCard(dish);
    }
    await submission.update({
      content: 'You rated ' + dish.name + ' with ' + ratingValue,
    });
  }
}

function createRateModal(dishname) {
  if (dishname.length > 45) dishname = dishname.substring(0, 45);
  const modal = new ModalBuilder().setCustomId('rate').setTitle(dishname);
  const rateInput = new TextInputBuilder()
    .setCustomId('value')
    .setLabel('Wie würdest du das Gericht bewerten? (1-5)')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(1)
    .setRequired(true);

  const rateInputComment = new TextInputBuilder()
    .setCustomId('comment')
    .setLabel('Optional: Dein Kommentar zur Bewertung')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(256)
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder().addComponents(rateInput);
  const secondActionRow = new ActionRowBuilder().addComponents(
    rateInputComment,
  );
  modal.addComponents(firstActionRow, secondActionRow);
  return modal;
}

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
    menuImgs.push(dish);
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
  menuImgs = menuImgs.sort((a, b) => a.category.localeCompare(b.category));
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('dishes')
    .setPlaceholder('Choose a dish');

  for (const dish of menuImgs) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(dish.name)
      .setDescription(dish.category)
      .setValue(dish.name);
    selectMenu.addOptions(option);
  }

  components.push(new ActionRowBuilder().addComponents(selectMenu));

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('favorite')
      .setLabel('Favorite')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('rate')
      .setLabel('Rate')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('diet')
      .setLabel('Diet Typ')
      .setStyle(ButtonStyle.Secondary),
  );
  components.push(buttonRow);
  return components;
}

function getDateForWeekday(weekChoice, weekdayChoice) {
  const today = new Date();
  const currentWeekday = today.getDay();
  console.log(today.toISOString().split('T')[0]);

  const date = new Date(today);
  date.setDate(today.getDate() - currentWeekday + weekdayChoice);

  switch (weekChoice) {
    case '1':
      break;
    case '2':
      date.setDate(date.getDate() + 7);
      break;
    case '3':
      date.setDate(date.getDate() - 7);
      break;
  }

  console.log(date.toISOString().split('T')[0]);

  return date.toISOString().split('T')[0];
}
