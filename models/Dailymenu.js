const mongoose = require('mongoose');

const dailymenuSchema = new mongoose.Schema({
  dishes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
  ],
  date: {
    type: Date,
    required: true,
  },
});

const Dailymenu = mongoose.model('Dailymenu', dailymenuSchema);

module.exports = Dailymenu;
