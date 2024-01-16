require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.BOT_TOKEN);

// for guild-based commands
rest
  .put(
    Routes.applicationGuildCommands(process.env.clientId, '625101546832658473'),
    {
      body: [],
    },
  )
  .then(() => console.log('Successfully deleted all guild commands.'))
  .catch(console.error);

// for global commands
rest
  .put(Routes.applicationCommands(process.env.clientId), { body: [] })
  .then(() => console.log('Successfully deleted all application commands.'))
  .catch(console.error);
