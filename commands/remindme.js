const { SlashCommandBuilder, Message, SelectMenuOptionBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remindme')
		.setDescription('Set a reminder for yourself!')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('What should the reminder be about?'))
        .addNumberOption( option =>
            option.setName('time')
            .setDescription('Time in MS (1000 = 1 second)')),        
	async execute(interaction) {

        const delay = interaction.options.getNumber("time");
        const reminder = interaction.options.getString("input");
        const userid = interaction.user;
        const channelid = interaction.channel.guild.systemChannelId;

		await interaction.reply('I will remind you in ' + delay);

        setTimeout(function() {
            interaction.guild.channels.cache.get(channelid).send(`${userid} ` + reminder)
        }, delay);
	},
};
