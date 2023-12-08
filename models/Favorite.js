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
      type: String,
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
      console.log(`Fav created User: ${userId} Dish: ${dishId}`);
    } catch (err) {
      console.error(
        `Could not create Fav User: ${userId}: Dish: ${dishId}: `,
        err
      );
    }
  } else {
    console.log("Fav already exists");
  }
}

module.exports = {
  Favorite,
  createOrUpdateFavorite,
};
