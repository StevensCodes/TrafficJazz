var mongoose = require("mongoose");

var monitorSchema = new mongoose.Schema({
   trip: String,
   author: String,
   origin: String,
   destination: String,
   lat: String,
   lng: String,
   start_time_stamp: Number
});

module.exports = mongoose.model("monitor", monitorSchema);
