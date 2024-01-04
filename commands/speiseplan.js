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
} = require('discord.js');
const Favorite = require('../models/Favorite.js');
const { getTodaysMenu } = require('../util/dish-menu-service.js');
const User = require('../models/User.js');
const Rating = require('../models/Rating.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('speiseplan')
    .setDescription('sieht speiseplan in dishcard mit buttons')
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
      const wochentag = interaction.options.getString('wochentag');
      console.log(woche, wochentag);
      let date;
      if (woche && !wochentag) {
        return await interaction.editReply(
          'Bitte gib eine Woche und einen Wochentag an.',
        );
      }
      if (!woche && wochentag) {
        date = getDateForWeekday('1', wochentag);
      }
 else if (woche && wochentag) {
        date = getDateForWeekday(woche, wochentag);
      }
 else {
        date = new Date().toISOString().split('T')[0];
      }
      const userAllergens = await findOrCreateUserAllergens(interaction);
      const menuImgs = [];
      let dailyMenu;
      try {
        dailyMenu = await getTodaysMenu(date);
      }
 catch (error) {
        console.error(error);
        await interaction.editReply('Es ist kein Menü für heute vorhanden.');
      }
      // console.log(dailyMenu.map((dish) => dish.name).join(", "));           possibly openAi keyword generation for dishes to generate recommendations

      await populateMenuImgs(dailyMenu, userAllergens, menuImgs);
      sizeOf(menuImgs);
      const components = createDishSelectMenu(menuImgs);

      const response = await interaction.editReply({
        content: 'Adjust the settings here:',
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
        time: 300_000,
      });

      let currentDish;
      collector.on('collect', async (i) => {
        if (i.isStringSelectMenu()) {
          currentDish = i.values[0];
          const img = menuImgs.find(
            (dish) => dish.name === currentDish,
          ).dishCard;
          await interaction.editReply({
            content: 'You selected ' + currentDish,
            files: [img],
          });
          await i.update('You selected ' + currentDish);
        }
 else if (i.isButton()) {
          switch (i.customId) {
            case 'submit':
              await i.deferUpdate();
              console.log('sub');
              break;
            case 'favorite': {
              if (!i.guild) return;
              if (!currentDish) {
                await i.deferUpdate();
                // TODO: Tell User to choose Dish first
                return;
              }
              const currentDishId = menuImgs.find(
                (dish) => dish.name === currentDish,
              )._id;
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
              }
 else {
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
              const dishname = menuImgs.find(
                (dish) => dish.name === currentDish,
              ).name;
              const dishId = menuImgs.find(
                (dish) => dish.name === currentDish,
              )._id;
              const modal = createRateModal(dishname);
              // problem: dishname is undefined
              await i.showModal(modal);
              const submission = await i.awaitModalSubmit({ time: 60_000 });
              await handleSubmission(submission, dishId, currentDish);
              break;
            }
            case 'close': {
              console.log('close');
              await i.deferUpdate();
              break;
            }
          }
        }
      });
    }
 catch (error) {
      console.error(error);
      await interaction.editReply('Es gab einen Fehler bei der Ausführung.');
    }
  },
};

function sizeOf(menuImgs) {
  const size = Buffer.byteLength(JSON.stringify(menuImgs));
  const kiloBytes = size / 1024;
  const megaBytes = kiloBytes / 1024;
  console.log(`Size of MenuImage: ${megaBytes} MB`);
  console.log(`Size of MenuImage: ${kiloBytes} KB`);
}

async function handleSubmission(submission, dishId, currentDish) {
  if (!submission) {
    submission.update({ content: 'You did not provide a rating' });
  }
 else if (submission.isModalSubmit()) {
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
      dishId,
      ratingValue,
      ratingComment,
    );
    await submission.update({
      content: 'You rated ' + currentDish + ' with ' + ratingValue,
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
  }
 else {
    userAllergens = user.allergens;
  }
  return userAllergens;
}

function createDishSelectMenu(menuImgs) {
  const components = [];
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
      .setCustomId('submit')
      .setLabel('Submit')
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
      .setCustomId('close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Secondary),
  );
  components.push(buttonRow);
  return components;
}

function getDateForWeekday(weekChoice, weekdayChoice) {
  const today = new Date();
  const currentWeekday = today.getDay();

  let date;
  switch (weekChoice) {
    case '1':
      date = new Date(today);
      date.setDate(today.getDate() + (weekdayChoice - currentWeekday));
      break;
    case '2':
      date = new Date(today);
      date.setDate(today.getDate() + 7 + (weekdayChoice - currentWeekday));
      break;
    case '3':
      date = new Date(today);
      date.setDate(today.getDate() - 7 + (weekdayChoice - currentWeekday));
      break;
  }
  console.log(date);

  return date.toISOString().split('T')[0];
}
