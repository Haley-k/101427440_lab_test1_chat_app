const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  firstname: { type: String },
  lastname: { type: String },
  password: { type: String, required: true },
  createOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);