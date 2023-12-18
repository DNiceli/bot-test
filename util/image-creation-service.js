const axios = require("axios");
const cloudinary = require("cloudinary").v2;
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

const uploadImage = async (imagePath) => {
  // Use the uploaded file's name as the asset's public ID and
  // allow overwriting the asset with new versions
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  };

  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(imagePath, options);
    console.log(result);
    return result.public_id;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  createDishPictureDalle,
  uploadImage,
};
