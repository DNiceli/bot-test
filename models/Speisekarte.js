const mongoose = require("mongoose");

const speisekarteSchema = new Schema({
  name: String,
  preis: {
    type: Number,
    required: true,
    default: 0,
  },
  beschreibung: String,
  allergene: String,
});

const Speisekarte = mongoose.model("Speisekarte", speisekarteSchema);

module.exports = { Speisekarte };
