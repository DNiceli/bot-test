const { SlashCommandBuilder } = require("@discordjs/builders");
const userList = require("../userListOp.js");
const { OpUsers } = require("../dbObjects");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-to-list")
    .setDescription(
      "Get added to the list of users to notify when boosters come online"
    ),
  async execute(interaction) {
    // wenn dieser user nicht schon in der liste ist, dann in die liste adden und speichern
    // wenn user in der liste ist, nichts machen
    addUserToList(interaction.user, interaction);
    console.log(userList.map((u) => u.username));
  },
};

function isUserInList(user) {
  return userList.some((u) => u.user_id === user.id);
}

// Ein Benutzer zur Liste hinzufügen, falls er noch nicht in der Liste ist
function addUserToList(user, interaction) {
  if (!isUserInList(user)) {
    userList.push(user);
    // Hier können Sie auch den Benutzer in der Datenbank speichern, z.B.
    OpUsers.findOrCreate({
      where: { user_id: user.id },
      defaults: { username: user.username },
    });
    interaction.reply("added");
  } else {
    interaction.reply("user already exists");
  }
}
