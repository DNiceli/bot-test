const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dishSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      default: '',
    },
    category: {
      type: String,
      required: true,
      default: '',
    },
    price: {
      type: String,
      required: true,
      default: '',
    },
    allergens: [
      {
        number: { type: String },
        description: { type: String },
        _id: false,
      },
    ],
    co2: {
      type: String,
      required: false,
      default: '',
    },
    h2o: {
      type: String,
      required: false,
      default: '',
    },
    ampel: {
      type: String,
      required: true,
      default: '',
    },
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      required: false,
    },
    dietType: {
      type: String,
      required: true,
      enum: ['vegan', 'vegetarisch', 'keine Angabe'],
      default: 'keine Angabe',
    },
    dishCard: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const Dish = mongoose.model('Dish', dishSchema);

module.exports = Dish;
