const { OpUsers } = require("./dbObjects");
const userList = [];

/*
async function populateUsers() {
  const allUsers = await OpUsers.findAll();
  allUsers.forEach((b) => userList.push(b));
  console.log(
    "All users as of initialization: " + userList.map((u) => u.username)
  );
}

populateUsers();
*/
module.exports = userList;
