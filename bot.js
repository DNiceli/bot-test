require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
require('./dbInit.js');
// prettier-ignore
const { fetchAndSaveDishes, fetchAndSaveAllergens, updateFavoritesAndRatingsAllDishes } = require('./util/dish-menu-service.js');
const { notify } = require('./util/notification-service.js');
const { createDishPictureDalle } = require('./util/image-creation-service.js');
const cron = require('node-cron');
// prettier-ignore
const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');
// prettier-ignore
const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages ],
  partials: [ Partials.Channel ],
});

client.once('ready', () => {
  console.log('Bot is online!');
  fetchAndSaveDishes(new Date().toISOString().split('T')[0]);
  fetchAndSaveAllergens(new Date().toISOString().split('T')[0]);
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true,
    });
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

client.login(process.env.BOT_TOKEN);

cron.schedule('0 9 * * *', async () => {
  console.log('running a task every day at 9am');
  await notify(client);
});

client.on(Events.MessageCreate, async (message) => {
  // testbereich
  if (message.author.bot) return;
  if (message.author.id !== '130787506441420801') return;
  if (message.content === 'stats') {
    const count = await getGuildCount();
    console.log(count);
    message.reply('Anzahl an Servern: ' + count);
  }

  if (message.content.startsWith('days ')) {
    // Extrahieren der Tage aus der Nachricht
    const days = parseInt(message.content.split(' ')[1]);
    if (!isNaN(days)) {
      const date = new Date();
      for (let i = 1; i < days; i++) {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() - i);
        if (nextDay.getDay() === 0 || nextDay.getDay() === 6) continue;
        await fetchAndSaveDishes(nextDay.toISOString().split('T')[0]);
      }
    } else {
      message.channel.send('Bitte geben Sie eine gültige Zahl an.');
    }
  }

  if (message.content === 'updateRF') {
    await updateFavoritesAndRatingsAllDishes();
  }

  if (message.content.startsWith('genImg ')) {
    const dishName = message.content.split(' ')[1];
    await createDishPictureDalle(dishName);
  }
});

async function getGuildCount() {
  const guilds = await client.guilds.fetch();
  return guilds.size;
}
