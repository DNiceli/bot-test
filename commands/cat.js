const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('cat')
		.setDescription('Replies with a random cat pic.'),
	async execute(interaction) {
		const catResult = await axios.get('https://aws.random.cat/meow');

		const { file } = await catResult.data;
        
		interaction.reply({ files: [file] });
	},
};