const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    // Not sure what else i need yet
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
