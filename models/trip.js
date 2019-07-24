var mongoose = require("mongoose");

var tripSchema = new mongoose.Schema({
   author: String,
   origin: String,
   destination: String,
   duration_in_traffic_there: [
      {
         day_reading_taken: Number,
         time_reading_taken: Number,
         minutes: Number
      }
   ],
   duration_in_traffic_back: [
      {
         day_reading_taken: Number,
         time_reading_taken: Number,
         minutes: Number
      }
    ]
});

module.exports = mongoose.model("trip", tripSchema);
