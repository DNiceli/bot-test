require('dotenv').config()

const { Client, Events, GatewayIntentBits, InteractionCollector, messageLink } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
], 
});

client.on('ready', () => {
    console.log("Discord Bot is logged in!")
});

client.on('messageCreate', (msg) => {
    if (msg.content === "is mee") {
        msg.reply("denmips uabbeth")
        msg.react("❤️")
    }
});

client.login(process.env.BOT_TOKEN)