const { SlashCommandBuilder } = require('discord.js');
const { request } = require('undici');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('cat')
		.setDescription('Replies with a random cat pic.'),
	async execute(interaction) {
		const catResult = await request('https://aws.random.cat/meow');

		const { file } = await catResult.body.json();
        
		interaction.reply({ files: [file] });
	},
};