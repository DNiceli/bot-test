const { SlashCommandBuilder } = require('discord.js');
const { getBalance } = require('../util/util.js');
const currency = require('../currency.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('Returns your current token balance'),
	async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
		console.log(currency);
		return interaction.reply(`${target.tag} has ${getBalance(target.id, currency)}💰`);
	},
};;