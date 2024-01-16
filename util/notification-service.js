require('dotenv').config();
const Notification = require('../models/Notification.js');
const Favorite = require('../models/Favorite.js');
const { getTodaysMenu } = require('./dish-menu-service.js');

async function notify(client) {
  console.log('notify');
  try {
    const dailyMenu = await getTodaysMenu(
      new Date().toISOString().split('T')[0],
    );
    const usersToNotify = await Notification.find({ notification: true });

    for (const user of usersToNotify) {
      const favorites = await Favorite.getFavorites(user.userId);
      if (!favorites) {
        console.log('No favorites found');
        return;
      }
      const favoriteDishes = dailyMenu.filter((dish) =>
        favorites.some((fav) => fav.dishId.toString() === dish._id.toString()),
      );

      if (favoriteDishes.length > 0) {
        let query = 'Favorisierte Gerichte heute im Angebot: \n';
        for (const dish of favoriteDishes) {
          query += `${dish.name} \n`;
        }
        client.users.send(user.userId, query);
      }
    }
  } catch (err) {
    console.log(err);
  }
}
module.exports = { notify };
