const mongoose = require("mongoose");

const dishSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      default: "",
    },
    category: {
      type: String,
      required: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    allergens: {
      type: String,
      default: "",
    },
    co2: {
      type: String,
      required: true,
      default: "",
    },
    h2o: {
      type: String,
      required: true,
      default: "",
    },
    ampel: {
      type: String,
      required: true,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const Dish = mongoose.model("Dish", dishSchema);

module.exports = { Dish };
