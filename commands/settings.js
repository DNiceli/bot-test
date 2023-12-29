const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
} = require("discord.js");
const Allergen = require("../models/Allergen");
const User = require("../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Einstellungen wie Filter, Benachrichtigungen, etc."),
  async execute(interaction) {
    const allergens = await Allergen.find();
    let user = await User.findOne({ userId: interaction.user.id });
    if (!user) {
      user = new User({
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guild.id,
        settings: [],
      });
      await user.save();
    }
    const userAllergenNumbers = user.allergens.map(
      (allergen) => allergen.number
    );
    const maxOptionsPerSelect = 25;
    const selectMenus = [];
    let currentSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("filter-0")
      .setPlaceholder("Choose allergens");

    let currentOptionsCount = 0;
    allergens.forEach((allergen, index) => {
      if (index % maxOptionsPerSelect === 0 && index !== 0) {
        currentSelectMenu.setMaxValues(currentOptionsCount);
        selectMenus.push(currentSelectMenu);
        currentSelectMenu = new StringSelectMenuBuilder()
          .setCustomId(`filter-${selectMenus.length}`)
          .setPlaceholder("Choose allergens");
        currentOptionsCount = 0;
      }
      if (userAllergenNumbers.includes(allergen.number)) {
        currentSelectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(allergen.number)
            .setDescription(allergen.description)
            .setValue(allergen.number)
            .setDefault(true)
        );
      } else {
        currentSelectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(allergen.number)
            .setDescription(allergen.description)
            .setValue(allergen.number)
        );
      }
      currentOptionsCount++;
    });

    currentSelectMenu.setMaxValues(currentOptionsCount);
    selectMenus.push(currentSelectMenu);

    const rows = selectMenus.map((selectMenu) =>
      new ActionRowBuilder().addComponents(selectMenu)
    );

    const response = await interaction.reply({
      content: "Adjust the settings here:",
      components: rows,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 3_600_000,
    });

    let selectedAllergens = [];
    collector.on("collect", async (i) => {
      // TODO: Allergene die neu reinkommen abspeichern. Button zum Speichern der Einstellungen hinzufügen.
      console.log(i);
      const selection = i.values;
      await i.reply(`${i.user} has selected ${selection}!`);
    });
  },
};
