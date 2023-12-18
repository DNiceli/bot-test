const mongoose = require("mongoose");

const dailymenuSchema = new mongoose.Schema({
  dishID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dish",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const Dailymenu = mongoose.model("Dailymenu", dailymenuSchema);

module.exports = Dailymenu;
