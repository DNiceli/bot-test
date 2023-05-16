const { SlashCommandBuilder } = require("@discordjs/builders");
const axios = require("axios");
const cheerio = require("cheerio");
const userList = require("../userListOp.js");

const myId = "130787506441420801";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("check-avail2")
    .setDescription("Checks availability of a product"),
  async execute(interaction) {
    const url =
      "https://www.mediamarkt.de/de/product/_bandai-one-piece-card-game-paramount-war-booster-op-02-einzelartikel-sammelkarten-2833371.html?utm_source=saturn.de&amp;utm_medium=own-pdp%20buttonnpm ";

    if (interaction.user.id !== myId) {
      return interaction.reply(
        "You do not have permission to use this command."
      );
    }

    interaction.reply("Refreshes started");
    console.log(userList);

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
            " MM " +
            i
        );

        i = i + 1;
        if (
          onlineStatus === "AVAILABLE" ||
          crossAvailabilityStatus === "AVAILABLE"
        ) {
          if (!isAvailable) {
            const currentTime = Date.now();
            console.log("Product is available! MM refresh");
            if (currentTime - lastNotificationTime >= 180000) {
              isAvailable = true;
              if (onlineStatus === "AVAILABLE") {
                userList.forEach((u) => {
                  u.send(
                    "The product is now available at : https://www.mediamarkt.de/de/product/_bandai-one-piece-card-game-paramount-war-booster-op-02-einzelartikel-sammelkarten-2833371.html?utm_source=saturn.de&amp;utm_medium=own-pdp%20buttonl"
                  ).catch((err) => {
                    console.log("Error caused by " + u);
                    console.log(err);
                  });
                });
              }
              if (crossAvailabilityStatus === "AVAILABLE") {
                userList.forEach((u) => {
                  u.send(
                    "The product is now available at : https://www.saturn.de/de/product/_bandai-one-piece-card-game-paramount-war-booster-op-02-einzelartikel-sammelkarten-2833371.html?utm_source=mediamarkt.de&utm_medium=own-pdp%20button"
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
    }, 3000);
  },
};
