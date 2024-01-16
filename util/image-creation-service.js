const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const Image = require('../models/Image.js');
const streamifier = require('streamifier');
require('dotenv').config();

cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

async function createDishPictureDalle(dishName) {
  try {
    let prompt = `Generiere ein, für eine Speisekarte geeignetes Bild von dem Essen: ${dishName} . Das Essen sollte auf einem Teller oder einer Schüssel serviert sein. Es soll ausschließlich das Essen zu sehen sein und der Hintergrund soll neutral sein. `;
    if (dishName === 'Süß-Sauer-Scharf Suppe') {
      prompt =
        'Generiere ein, für eine Speisekarte geeignetes Bild von dem Gericht: Sweet Sour Spicy Soup .';
    }
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        prompt: prompt,
        n: 1,
        size: '256x256',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.openAIAPI}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const picture = response.data;

    return picture.data[0].url;
  } catch (error) {
    if (error.response) {
      if (error.response.data.error.code === 'content_policy_violation') {
        console.log('TODO: Handle content policy violation');
      }
      console.error('Response body:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up the request:', error.message);
    }
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

const uploadBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

function uploadImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );

    stream.end(buffer);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createUploadAndSaveDishPicture(dishName) {
  let attempts = 0;
  const maxAttempts = 6;

  while (attempts < maxAttempts) {
    try {
      const imagePath = await createDishPictureDalle(dishName);
      const imageUrl = await uploadImage(imagePath);
      const image = new Image({ url: imageUrl });
      await image.save();
      return image._id;
    } catch (error) {
      console.error('Error creating dish picture:', error);
      attempts++;
      if (attempts < maxAttempts) {
        console.log(
          `Retrying in 60 seconds... (Attempt ${attempts} of ${maxAttempts})`,
        );
        await sleep(60000);
      } else {
        console.log(`Max attempts reached, giving up on ${dishName}.`);
        throw error;
      }
    }
  }
}

module.exports = {
  createUploadAndSaveDishPicture,
  uploadBuffer,
  uploadImageBuffer,
  createDishPictureDalle,
};
