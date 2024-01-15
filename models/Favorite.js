const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const favoriteSchema = new Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    guildId: {
      type: String,
      ref: 'Guild',
      required: true,
    },
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

favoriteSchema.statics.createOrUpdateFavorite = async function(
  userId,
  guildId,
  dishId,
) {
  const existingFav = await Favorite.findOne({
    userId: userId,
    guildId: guildId,
    dishId: dishId,
  });

  if (!existingFav) {
    try {
      await Favorite.create({
        userId: userId,
        guildId: guildId,
        dishId: dishId,
      });
      console.log(
        `Fav created User: ${userId} Dish: ${dishId} Guild: ${guildId}`,
      );
      return true;
    } catch (err) {
      console.error(
        `Could not create Fav User: ${userId}: Dish: ${dishId} Guild: ${guildId}`,
        err,
      );
      return false;
    }
  } else {
    console.log('Fav already exists');
    return false;
  }
};

favoriteSchema.statics.getFavorites = async function(userId) {
  const favorites = await Favorite.find({
    userId: userId,
  });
  if (!favorites) {
    console.log('No favorites found');
    return;
  }
  return favorites;
};

favoriteSchema.statics.getFavoritesCount = async function(dishId) {
  const favorites = await Favorite.find({
    dishId: dishId,
  });
  if (!favorites) {
    console.log('No favorites found');
    return 0;
  }

  return favorites.length;
};

favoriteSchema.statics.getMostFavoritedDishes = async function() {
  try {
    return await Favorite.aggregate([
      {
        $group: { _id: '$dishId', totalQuantity: { $count: {} } },
      },
    ]);
  } catch (error) {
    console.error('Error fetching most favorited dishes:', error);
    return [];
  }
};

const Favorite = mongoose.model('Favorite', favoriteSchema);
module.exports = Favorite;
