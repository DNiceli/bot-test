const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hilfefunktion'),
  async execute(interaction) {
    const commands = interaction.client.commands;
    const commandNames = commands.map((command) => command.data.name);
    const commandDescriptions = commands.map(
      (command) => command.data.description,
    );

    const commandList = commandNames.map((name, index) => {
      return `**/${name}**: ${commandDescriptions[index]}`;
    });

    await interaction.reply({
      content:
        'Folgende Slash-Befehle sind verfügbar: \n' + commandList.join('\n'),
      ephemeral: true,
    });
  },
};
