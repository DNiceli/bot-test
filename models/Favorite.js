const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const favoriteSchema = new Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    guildId: {
      type: String,
      ref: "Guild",
      required: true,
    },
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Favorite = mongoose.model("Favorite", favoriteSchema);

async function createOrUpdateFavorite(userId, guildId, dishId) {
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
        `Fav created User: ${userId} Dish: ${dishId} Guild: ${guildId}`
      );
    } catch (err) {
      console.error(
        `Could not create Fav User: ${userId}: Dish: ${dishId} Guild: ${guildId}`,
        err
      );
    }
  } else {
    console.log("Fav already exists");
  }
}

getFavorites = async (userId) => {
  const favorites = await Favorite.find({
    userId: userId,
  });
  if (!favorites) {
    console.log("No favorites found");
    return;
  }
  return favorites;
};

module.exports = {
  Favorite,
  createOrUpdateFavorite,
  getFavorites,
};
