const { SlashCommandBuilder } = require("@discordjs/builders");
const axios = require("axios");
const cheerio = require("cheerio");
const { SelectMenuOptionBuilder } = require("discord.js");
const userList = require("../userListOp.js");

const myId = "130787506441420801";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("check-availability")
    .setDescription("Checks availability of a product"),

  async execute(interaction) {
    const url =
      "https://www.saturn.de/de/product/_bandai-one-piece-card-game-paramount-war-booster-op-02-einzelartikel-sammelkarten-2833371.html";

    if (interaction.user.id !== myId) {
      return interaction.reply(
        "You do not have permission to use this command."
      );
    }

    interaction.reply("Refreshes started");

    // Start listening for availability
    let isAvailable = false;
    let lastNotificationTime = 0;
    let i = 0;
    setInterval(() => {
      axios.get(url).then((response) => {
        const html = response.data;
        const $ = cheerio.load(html);
        const onlineStatus = $("[data-product-online-status]").attr(
          "data-product-online-status"
        );
        const crossAvailabilityStatus = $(
          "[data-cross-availability-status]"
        ).attr("data-cross-availability-status");
        console.log(
          "checking availability... " +
            userList.map((u) => u.username) +
            " Saturn " +
            i
        );

        i = i + 1;
        if (
          onlineStatus === "AVAILABLE" ||
          crossAvailabilityStatus === "AVAILABLE"
        ) {
          if (!isAvailable) {
            console.log("Product is available! Saturn refresh");
            const currentTime = Date.now(); // Get the current time
            if (currentTime - lastNotificationTime >= 180000) {
              // Check if 3 minutes have passed since the last notification
              isAvailable = true;
              if (onlineStatus === "AVAILABLE") {
                userList.forEach((u) => {
                  u.send(
                    "The product is now available at : https://www.saturn.de/de/product/_bandai-one-piece-card-game-paramount-war-booster-op-02-einzelartikel-sammelkarten-2833371.html?utm_source=mediamarkt.de&utm_medium=own-pdp%20button"
                  ).catch((err) => {
                    console.log("Error caused by " + u);
                    console.log(err);
                  });
                });
              }
              if (crossAvailabilityStatus === "AVAILABLE") {
                userList.forEach((u) => {
                  u.send(
                    "The product is now available at : https://www.mediamarkt.de/de/product/_bandai-one-piece-card-game-paramount-war-booster-op-02-einzelartikel-sammelkarten-2833371.html?utm_source=saturn.de&amp;utm_medium=own-pdp%20button"
                  ).catch((err) => {
                    console.log("Error caused by " + u);
                    console.log(err);
                  });
                });
              }
              lastNotificationTime = currentTime;
            }
          }
        } else {
          isAvailable = false;
        }
      });
    }, 10000);
  },
};
