const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const allergenSchema = new Schema({
  number: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Allergen", allergenSchema);
