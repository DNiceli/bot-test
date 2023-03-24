require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { Users, CurrencyShop } = require("./dbObjects.js");
const { Op } = require("sequelize");
const util = require("./util/util.js");
const userList = require("./userListOp.js");

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  codeBlock,
} = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const currency = require("./currency.js");
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const guild = client.guilds.cache.get("1084119229776805928");
  if (!guild) {
    console.log("cant find");
  }
  // Fetch all members in the guild and cache them
  await guild.members.fetch();

  // Get a collection of all members in the guild
  const members = guild.members.cache;

  // Loop through each member in the collection and add them to the array
  members.forEach((member) => {
    if (!member.user.bot) {
      userList.push(member.user);
    }
  });
  console.log(userList);
});

/*
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  util.addBalance(message.author.id, 1, currency);
  console.log(currency);
});
*/
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
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

exports = currency;

client.login(process.env.BOT_TOKEN);
