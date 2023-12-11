const axios = require("axios");
require("dotenv").config();

async function createDishPictureDalle(dishName) {
  try {
    const prompt = `Generate a picture of ${dishName}.`;
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        prompt: prompt,
        n: 1,
        size: "256x256",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.openAIAPI}`,
          "Content-Type": "application/json",
        },
      }
    );

    const picture = response.data;

    return picture.data[0].url;
  } catch (error) {
    console.error("Error generating dish picture:", error);
    throw error;
  }
}

module.exports = {
  createDishPictureDalle,
};
