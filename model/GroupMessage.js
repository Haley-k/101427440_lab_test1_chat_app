const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GroupMessageSchema = new Schema({
  from_user: { type: String, required: true },
  room: { type: String, required: true },
  message: { type: String, required: true },
  date_sent: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GroupMessage", GroupMessageSchema);