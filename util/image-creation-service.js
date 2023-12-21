const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const Image = require("../models/Image.js");
require("dotenv").config();

cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

async function createDishPictureDalle(dishName) {
  try {
    const prompt = `Generiere ein Bild von dem Gericht: ${dishName}, behalte im Hinterkopf, dass es in einer Hochschulmensa angeboten wird.`;
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
    return result.url;
  } catch (error) {
    console.error(error);
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createUploadAndSaveDishPicture(dishName) {
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const imagePath = await createDishPictureDalle(dishName);
      const imageUrl = await uploadImage(imagePath);
      const image = new Image({ url: imageUrl });
      await image.save();
      return image._id;
    } catch (error) {
      console.error("Error creating dish picture:", error);
      attempts++;
      if (attempts < maxAttempts) {
        console.log(
          `Retrying in 60 seconds... (Attempt ${attempts} of ${maxAttempts})`
        );
        await sleep(60000); // Wait for 60 seconds before retrying
      } else {
        throw error;
      }
    }
  }
}

module.exports = createUploadAndSaveDishPicture;
