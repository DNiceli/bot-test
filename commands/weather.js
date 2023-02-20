require('dotenv').config()
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { request } = require('undici');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('weather')
		.setDescription('Replies with current weather forecast')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('City where to forecast and country code (for example London,uk or Berlin,de)')),
	async execute(interaction) {
        const apiKey = process.env.weatherApiKey;
        const city = interaction.options.getString("input");
        const weatherResult = await request(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)

        const json = await weatherResult.body.json();

        const weatherEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Weather for ' + city)
        .addFields(
            { name: 'Temp', value: "" + json.main.temp + " °C" },
            { name: 'Feels Like', value: "" + json.main.feels_like + " °C", inline: true },
            { name: 'Max Temp', value: "" + json.main.temp_max + " °C", inline: true  },
            { name: 'Min Temp', value: "" + json.main.temp_min + " °C", inline: true  },
            { name: 'Main', value: "" + json.weather[0].main}
        )
        .setImage(`http://openweathermap.org/img/wn/${json.weather[0].icon}@2x.png`)

        
		interaction.reply({ embeds: [weatherEmbed]});
	},
};