const mongoose = require("mongoose");

const userSchema = new Schema({
  user_id: String,
  user_tag: String,
});

const User = mongoose.model("User", userSchema);

module.exports = { User };
