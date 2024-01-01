const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ratingSchema = new Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    dishId: {
      type: String,
      ref: "Dish",
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    comment: String,
  },
  {
    timestamps: true,
  }
);

const Rating = mongoose.model("Rating", ratingSchema);

module.exports = Rating;
