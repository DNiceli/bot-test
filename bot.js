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
const { Client, Collection, Events, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
// prettier-ignore
const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages ],
  partials: [ Partials.Channel ],
});

client.once('ready', () => {
  console.log('Bot is online!');
  checkToggles();
  client.user.setPresence({
    activities: [
      {
        type: ActivityType.Custom,
        name: 'custom',
        state: '/help für Befehlsliste',
      },
    ],
  });
  if (process.env.FETCH_ON_START === 'true') {
    fetchAndSaveDishes(new Date().toISOString().split('T')[0]);
    fetchAndSaveAllergens(new Date().toISOString().split('T')[0]);
  }
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
  if (message.content === 'notify') {
    await notify(client);
  }

  if (message.content.startsWith('days ')) {
    // Extrahieren der Tage und der Option aus der Nachricht
    const parts = message.content.split(' ');
    const days = parseInt(parts[1]);
    const option = parts.length > 2 ? parts[2] : null;
    if (!isNaN(days)) {
      const date = new Date();
      console.log('updating Dishes for ' + days + ' days');
      for (let i = 0; i < days; i++) {
        const nextDay = new Date(date);
        if (option === 'back') {
          nextDay.setDate(date.getDate() - i);
        } else {
          nextDay.setDate(date.getDate() + i);
        }
        if (nextDay.getDay() === 0 || nextDay.getDay() === 6) continue;
        fetchAndSaveDishes(nextDay.toISOString().split('T')[0]);
      }
    } else {
      message.channel.send('Bitte geben Sie eine gültige Zahl an.');
    }
  }

  if (message.content.startsWith('dateFetch ')) {
    const input = message.content.split(' ')[1];
    const date = new Date(input);
    fetchAndSaveDishes(date);
  }

  if (message.content === 'updateRF') {
    await updateFavoritesAndRatingsAllDishes();
  }

  if (message.content.startsWith('genImg ')) {
    const dishName = message.content.split(' ')[1];
    await createDishPictureDalle(dishName);
  }
});

function checkToggles() {
  if (process.env.UPDATE_DISHCARDS === 'true') {
    console.log('Dishcards Überschreiben ist aktiviert.');
  }
  if (process.env.UPDATE_DC_SP_TOGGLE === 'true') {
    console.log('Dishcards Überschreiben durch Usernutzung ist aktiviert.');
  }
  if (process.env.OVERRIDE_DATE === 'true') {
    console.log('Datum überschreiben ist aktiviert.');
  }
  if (process.env.FETCH_ON_START === 'true') {
    console.log('Fetch on start ist aktiviert.');
  }
}

async function getGuildCount() {
  const guilds = await client.guilds.fetch();
  return guilds.size;
}
