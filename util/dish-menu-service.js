require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const Dish = require("../models/Dish.js");
const Menu = require("../models/Dailymenu.js");

async function fetchAndSaveDishes() {
  try {
    const url = process.env.mensaUrl2;
    const menu = new Map();
    await axios
      .post(
        url,
        new URLSearchParams({
          resources_id: "527",
          date: "2023-11-23", // Datum
        }),
        {
          headers: {
            "x-requested-with": "XMLHttpRequest",
          },
        }
      )
      .then((response) => {
        const html = response.data;
        const $ = cheerio.load(html);

        $(".container-fluid.splGroupWrapper").each((_, groupWrapper) => {
          const group = $(groupWrapper).find(".splGroup").text().trim();
          const dishes = [];

          $(groupWrapper)
            .find(".row.splMeal")
            .each(async (_, meal) => {
              const dish = {
                name: $(meal).find(".col-xs-6.col-md-5 > .bold").text().trim(),
                price: $(meal)
                  .find(".col-xs-12.col-md-3.text-right")
                  .text()
                  .trim(),
                allergens: $(meal).attr("lang"),
                ampel: $(meal).find("img.splIcon").attr("alt"),
                h2o: $(meal)
                  .find("img[aria-describedby^='tooltip_H2O']")
                  .attr("alt"),
                co2: $(meal)
                  .find("img[aria-describedby^='tooltip_CO2']")
                  .attr("alt"),
              };
              console.log("allergens " + dish.allergens);
              dishes.push(dish);
            });

          menu.set(group, dishes);
        });
      })

      .catch((error) => {
        console.log(error);
      });
    createDishes(menu);
    return menu;
  } catch (error) {
    console.error(error);
  }
}

function createDishes(menu) {
  for (const category of menu.keys()) {
    const dishes = menu.get(category);
    for (const dish of dishes) {
      createOrUpdateDish(dish, category);
    }
  }
}

async function createOrUpdateDish(dish, category) {
  const existingDish = await Dish.findOne({
    name: dish.name,
  });

  if (!existingDish) {
    await parseDish(dish, category)
      .then(() => console.log("Dish created!"))
      .catch((err) => console.error("Could not create dish:", err));
  } else {
    console.log("Dish already exists");
  }
}

async function parseDish(dish, category) {
  try {
    await Dish.create({
      name: dish.name,
      category: category,
      price: dish.price,
      allergens: dish.allergens,
      co2: dish.co2,
      h2o: dish.h2o,
      ampel: dish.ampel,
    });
    console.log(`Dish ${dish.name} created successfully with ID ${dish._id}`);
  } catch (err) {
    console.error(`Could not create dish ${dish.name}:`, err);
  }
}

async function createOrUpdateMenu(dish) {
  const today = new Date().toISOString().split("T")[0];
  const existingMenu = await Menu.findOne({ date: today });

  if (!existingMenu) {
    const menu = new Menu({
      date: today,
      dishes: [dish],
    });
    await menu.save();
    console.log(`Menu created for ${today}`);
  } else {
    existingMenu.dishes.push(dish);
    await existingMenu.save();
    console.log(`Dish added to existing menu for ${today}`);
  }
}

module.exports = {
  fetchAndSaveDishes,
};
