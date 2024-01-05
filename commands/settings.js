const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const Allergen = require('../models/Allergen');
const User = require('../models/User');
const { fetchAndSaveAllergens } = require('../util/dish-menu-service');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Einstellungen wie Filter, Benachrichtigungen, etc.'),
  async execute(interaction) {
    try {
      const allergens = await findOrFetchAllergens();
      const user = await findOrCreateUser(interaction);

      const userAllergenValues = new Set(
        user.allergens.map((allergen) => allergen.number),
      );
      const selectedValues = new Map();

      categorizeUserAllergens(allergens, userAllergenValues, selectedValues);

      const selectMenus = createAllergenSelectMenus(
        allergens,
        userAllergenValues,
      );

      await interaction.reply({
        content: 'Adjust the settings here:',
        components: selectMenus,
        fetchReply: true,
        ephemeral: true,
      });
      const response = await interaction.fetchReply();
      const collector = response.createMessageComponentCollector({
        filter: (i) =>
          (i.componentType === ComponentType.Button ||
            i.componentType === ComponentType.StringSelect) &&
          i.user.id === interaction.user.id,
        time: 300_000,
      });

      collector.on('collect', async (i) => {
        if (i.isStringSelectMenu()) {
          console.log(i.customId + i.values);
          selectedValues.set(i.customId, i.values);
          await i.deferUpdate();
        } else if (i.isButton()) {
          if (i.customId === 'submit') {
            const selectedAllergenValues = Array.from(
              selectedValues.values(),
            ).flat();
            const uniqueSelectedAllergenValues = [
              ...new Set(selectedAllergenValues),
            ];
            if (
              uniqueSelectedAllergenValues.sort().toString() !==
              Array.from(userAllergenValues).sort().toString()
            ) {
              try {
                user.allergens = uniqueSelectedAllergenValues.map((value) =>
                  allergens.find(
                    (allergen) => allergen.number.toString() === value,
                  ),
                );
                await user.save();
                await i.update({ content: 'Settings saved', components: [] });
              } catch (error) {
                console.error('Error updating user:', error);
                await i.update({
                  content: 'Error saving settings',
                  components: [],
                });
              }
            } else {
              await i.update({ content: 'No changes made', components: [] });
            }
          } else if (i.customId === 'cancel') {
            await i.update({ content: 'Process canceled', components: [] });
          } else if (i.customId === 'reset') {
            user.allergens = [];
            await user.save();
            await i.update({ content: 'Allergens resetted', components: [] });
          }
          collector.stop();
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.reply(
        'Es gab einen Fehler beim Anzeigen der Einstellungen.',
      );
    }
  },
};

function createAllergenSelectMenus(allergens, userAllergenValues) {
  const maxOptionsPerSelect = 25;
  const selectMenus = [];
  let currentSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('filter-0')
    .setPlaceholder('Choose allergens');

  let currentOptionsCount = 0;
  allergens.forEach((allergen, index) => {
    if (index % maxOptionsPerSelect === 0 && index !== 0) {
      currentSelectMenu.setMaxValues(currentOptionsCount);
      selectMenus.push(new ActionRowBuilder().addComponents(currentSelectMenu));
      currentSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`filter-${selectMenus.length}`)
        .setPlaceholder('Choose allergens');
      currentOptionsCount = 0;
    }
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(allergen.number)
      .setDescription(allergen.description)
      .setValue(allergen.number);
    if (userAllergenValues.has(allergen.number)) {
      option.setDefault(true);
    }
    currentSelectMenu.addOptions(option);
    currentOptionsCount++;
  });

  currentSelectMenu.setMaxValues(currentOptionsCount);
  selectMenus.push(new ActionRowBuilder().addComponents(currentSelectMenu));

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('submit')
      .setLabel('Submit')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('reset')
      .setLabel('Reset')
      .setStyle(ButtonStyle.Secondary),
  );
  selectMenus.push(buttonRow);
  return selectMenus;
}

function categorizeUserAllergens(
  allergens,
  userAllergenValues,
  selectedValues,
) {
  allergens.forEach((allergen) => {
    const numericPart = parseInt(allergen.number, 10);
    // Extract numeric part for grouping
    const menuId = isNaN(numericPart)
      ? 'filter-unknown'
      : `filter-${Math.floor(numericPart === 24 ? 1 : numericPart / 25)}`;
    console.log('menuID ' + menuId);

    // Use the full alphanumeric value for identification
    if (userAllergenValues.has(allergen.number)) {
      if (!selectedValues.has(menuId)) {
        selectedValues.set(menuId, []);
      }
      selectedValues.get(menuId).push(allergen.number);
    }
  });
}

async function findOrFetchAllergens() {
  let allergens;
  try {
    allergens = await Allergen.find();
  } catch (error) {
    // Handle the error or fallback if Allergen.find() fails
    console.error('Error fetching allergens:', error);
    allergens = await fetchAndSaveAllergens();
  }
  return allergens;
}

async function findOrCreateUser(interaction) {
  let user;
  try {
    user = await User.findOne({ userId: interaction.user.id });
    if (!user) {
      user = new User({
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guild.id,
        allergens: [],
      });
      await user.save();
    }
  } catch (error) {
    console.error('Error handling user data:', error);
  }
  return user;
}
