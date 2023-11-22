require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const { SlashCommandBuilder } = require("discord.js");
const Dish = require("../models/Dish.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fetch-gerichte-and-save")
    .setDescription("speichert gerichte in der Datenbank"),
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const menu = await fetchAndSaveDishes();

      const message = await interaction.editReply({
        content: "Done:",
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply("ERROR ERROR, siehe console");
    }
  },
};

async function fetchAndSaveDishes() {
  try {
    const url = process.env.mensaUrl2;
    const menu = new Map();
    await axios
      .post(
        url,
        new URLSearchParams({
          resources_id: "527",
          date: "2023-11-21", // Datum
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
      Dish.createOrUpdateDishWithCurrentDate(dish, category);
    }
  }
}

module.exports = { fetchAndSaveDishes };
