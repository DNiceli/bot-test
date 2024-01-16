const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ratingSchema = new Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    dishId: {
      type: String,
      ref: 'Dish',
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    comment: String,
  },
  {
    timestamps: true,
  },
);

ratingSchema.statics.getAverageRating = async function(dishId) {
  const ratings = await this.find({ dishId: dishId });
  if (ratings.length === 0) {
    return 0;
  }
  const sum = ratings.reduce(
    (accumulator, rating) => accumulator + rating.score,
    0,
  );
  return sum / ratings.length;
};

ratingSchema.statics.findRatingsForUser = async function(userId) {
  try {
    if (mongoose.isValidObjectId(userId)) {
      throw new Error('userId is required');
    }
    const ratings = await this.find({ userId: userId });
    return ratings;
  } catch (err) {
    console.log(`Could not find ratings for user ${userId}`);
    console.error(`Could not find ratings for user ${userId} : ${err}`);
    return [];
  }
};

ratingSchema.statics.createOrUpdateRating = async function(
  userId,
  dishId,
  score,
  comment = '',
) {
  const existingFav = await Rating.findOne({
    userId: userId,
    dishId: dishId,
  });

  if (!existingFav) {
    try {
      await Rating.create({
        userId: userId,
        dishId: dishId,
        score: score,
        comment: comment,
      });
      console.log(`Rating created User: ${userId} Dish: ${dishId}`);
      return true;
    } catch (err) {
      console.error(
        `Could not create Rating User: ${userId}: Dish: ${dishId}`,
        err,
      );
      return false;
    }
  } else {
    existingFav.score = score;
    existingFav.comment = comment;
    existingFav.save();
    console.log(`Rating updated! for ${userId}: Dish: ${dishId}`);
    return false;
  }
};

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
