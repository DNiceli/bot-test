const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require("uuid");

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
      type: String,
      required: true,
      default: "",
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
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Dish = mongoose.model("Dish", dishSchema);

async function createOrUpdateDishWithCurrentDate(dish, category) {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  await createOrUpdateDish(dish, currentDate, category);
}

async function createOrUpdateDish(dish, date, category) {
  const existingDish = await Dish.findOne({ name: dish.name });

  if (!existingDish) {
    await parseDish(dish, category, date)
      .then(() => console.log("Dish created!"))
      .catch((err) => console.error("Could not create dish:", err));
  } else {
    const existingDate = new Date(existingDish.date);
    const newDate = new Date(date);

    if (existingDate.toDateString() !== newDate.toDateString()) {
      await parseDish(dish, category, newDate)
        .then(() =>
          console.log("New instance of dish created for a different day!")
        )
        .catch((err) =>
          console.error("Could not create new instance of dish:", err)
        );
    } else {
      console.log("Dish already exists for the same day");
    }
  }
}

async function parseDish(dish, category, date) {
  const uniqueId = uuidv4();

  try {
    await Dish.create({
      id: uniqueId,
      name: dish.name,
      category: category,
      price: dish.price,
      allergens: dish.allergens,
      co2: dish.co2,
      h2o: dish.h2o,
      ampel: dish.ampel,
      date: date,
    });
    console.log(`Dish ${dish.name} created successfully with ID ${uniqueId}`);
  } catch (err) {
    console.error(`Could not create dish ${dish.name}:`, err);
  }
}

async function fetchDishesFromToday() {
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get tomorrow's date at midnight
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  try {
    const dishes = await Dish.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    }).exec();

    if (dishes.length === 0) {
      console.log("No dishes found for today.");
    } else {
      console.log(`Found ${dishes.length} dishes for today.`);
      return dishes;
    }
  } catch (err) {
    console.error("An error occurred while fetching dishes:", err);
  }
}

module.exports = {
  Dish,
  createOrUpdateDishWithCurrentDate,
  fetchDishesFromToday,
};
