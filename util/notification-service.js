require("dotenv").config();
const Notification = require("../models/Notification.js");
const { getFavorites } = require("../models/Favorite.js");
const { getTodaysMenu } = require("./dish-menu-service.js");

async function notify(client) {
  console.log("notify");
  try {
    const dailyMenu = await getTodaysMenu();
    const usersToNotify = await Notification.find({ notification: true });
    console.log("Users:" + usersToNotify);

    for (const user of usersToNotify) {
      const favorites = await getFavorites(user.userId);
      if (!favorites) {
        console.log("No favorites found");
        return;
      }
      console.log("Favorites:" + favorites);
      const favoriteDishes = dailyMenu.filter((dish) =>
        favorites.some((fav) => fav.dishId.equals(dish._id))
      );
      console.log(user.userId);
      console.log(favoriteDishes);

      if (favoriteDishes.length > 0) {
        let query = "";
        for (const dish of favoriteDishes) {
          query += `${dish.name} `;
        }
        console.log("query" + query);
        client.users.send(
          user.userId,
          query + "is/are available today! Check the menu for more details."
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
}
module.exports = { notify };
