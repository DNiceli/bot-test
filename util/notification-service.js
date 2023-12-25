require("dotenv").config();
const Notification = require("../models/Notification.js");
const { getFavorites } = require("../models/Favorite.js");
const { getTodaysMenu } = require("./dish-menu-service.js");

async function notify(client) {
  console.log("notify");
  try {
    const dailyMenu = await getTodaysMenu();
    const usersToNotify = await Notification.find({ notification: true });

    for (const user of usersToNotify) {
      const favorites = await getFavorites(user.userId);
      if (!favorites) {
        console.log("No favorites found");
        return;
      }
      const favoriteDishes = dailyMenu.filter((dish) =>
        favorites.some((fav) => fav.dishId.toString() === dish._id.toString())
      );

      if (favoriteDishes.length > 0) {
        let query = "";
        for (const dish of favoriteDishes) {
          query += `${dish.name} `;
        }
        client.users.send(user.userId, query + " Favorite alarm!");
      }
    }
  } catch (err) {
    console.log(err);
  }
}
module.exports = { notify };
