var express         = require("express"),
    app             = express(),
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    Trip            = require("./models/trip"),
    User            = require("./models/user"),
    Monitor         = require("./models/monitor"),
    axios           = require("axios"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local").Strategy,
    http            = require("http");
    
var url = process.env.DATABASEURL;
mongoose.connect(url);

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: process.env.ENCRYPTION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//These will pass the variable currentUser to every .ejs file without me having
//to pass them to each and every one of them, so all the routes will have these
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   next();
});

app.use(function(req, res, next){
   res.locals.message = "";
   next();
});

var sentMessage = "";



function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/");
}


//Routes
//-------------------------------------------


//root route
app.get("/", function(req, res){
    res.render("landing.ejs");
});


//login failure
app.get("/loginError", function(req, res){
    res.render("landing.ejs", {message: "Incorrect Password!"});
});


//Main Page for Profile
app.get("/routes", isLoggedIn, function(req, res){
    var wtrips = [];
    var wtrip = [];
    var wduration_in_traffic_there = [];
    var wduration_in_traffic_there_day = [];
    var wduration_in_traffic_back = [];
    var wduration_in_traffic_back_day = [];
    
    Trip.find({author: req.user.id}).then(function(trip){
        trip.forEach(function(trip){
            wtrip.push(trip.origin);
            wtrip.push(trip.destination);
    
            for (var d = 0; d < 7; d++) {
                switch(d) {
                    case 0:
                        wduration_in_traffic_there_day.push('Monday');
                        break;
                    case 1:
                        wduration_in_traffic_there_day.push('Tuesday');
                        break;
                    case 2:
                        wduration_in_traffic_there_day.push('Wednesday');
                        break;
                    case 3:
                        wduration_in_traffic_there_day.push('Thursday');
                        break;
                    case 4:
                        wduration_in_traffic_there_day.push('Friday');
                        break;
                    case 5:
                        wduration_in_traffic_there_day.push('Saturday');
                        break;
                    case 6:
                        wduration_in_traffic_there_day.push('Sunday');
                        break;
                }
                for (var r = 0; r < 96; r++) {
                    var vt = 'x';
                    trip.duration_in_traffic_there.forEach(function(there){
                        if (d == there.day_reading_taken && r == there.time_reading_taken) {
                            vt = there.minutes;
                        }
                    });
                wduration_in_traffic_there_day.push(vt);
                }
                wduration_in_traffic_there.push(wduration_in_traffic_there_day);
                wduration_in_traffic_there_day = [];
            }
            wtrip.push(wduration_in_traffic_there);
            wduration_in_traffic_there = [];
    
    
            for (var d = 0; d < 7; d++) {
                switch(d) {
                    case 0:
                        wduration_in_traffic_back_day.push('Monday');
                        break;
                    case 1:
                        wduration_in_traffic_back_day.push('Tuesday');
                        break;
                    case 2:
                        wduration_in_traffic_back_day.push('Wednesday');
                        break;
                    case 3:
                        wduration_in_traffic_back_day.push('Thursday');
                        break;
                    case 4:
                        wduration_in_traffic_back_day.push('Friday');
                        break;
                    case 5:
                        wduration_in_traffic_back_day.push('Saturday');
                        break;
                    case 6:
                        wduration_in_traffic_back_day.push('Sunday');
                        break;
                }
                for (var r = 0; r < 96; r++) {
                    var vb = 'x';
                    trip.duration_in_traffic_back.forEach(function(back){
                        if (d == back.day_reading_taken && r == back.time_reading_taken) {
                            vb = back.minutes;
                        }
                    });
                wduration_in_traffic_back_day.push(vb);
                }
                wduration_in_traffic_back.push(wduration_in_traffic_back_day);
                wduration_in_traffic_back_day = [];
            }
    
            wtrip.push(wduration_in_traffic_back);
            wduration_in_traffic_back = [];
    
            wtrips.push(wtrip);
            wtrip = [];
    
        });
    
        res.render("routes.ejs", {message: sentMessage, data: wtrips});
        sentMessage = "";
    });
});


//login attempt
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/routes",
        failureRedirect: "/loginError"
    }), function(req, res){
});


//sign up attempt
app.post("/register", function(req, res){
    if (req.body.password != req.body.confirmPassword) {
        return res.render("landing.ejs", {message: "The Passwords must match!"});
    } else if (/\W/.test(req.body.username) || req.body.username.indexOf(' ') >= 0 || req.body.password.indexOf(' ') >= 0){
        return res.render("landing.ejs", {message: "Invalid character inside Username or Password!"});
    } else {
        var newUser = new User({username: req.body.username});
        User.register(newUser, req.body.password, function(err, user){
            if(err){
                console.log(err);
                return res.render("landing.ejs", {message: "Username already exists!"});
            }
            passport.authenticate("local")(req, res, function(){
               res.redirect("/routes");
            });
        });
    }
});


//logout attempt
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});


//Add new route to Monitor
app.post("/monitor", isLoggedIn, function(req, res){

    User.findOne({username: req.user.username}).then(function(user) {

        //See how many trips user is already monitoring
        Trip.find({author: user.id}).then(function(tripCount){
            if (tripCount.length < 3) {

                //Check if route is Monitorable trip duration wise
                axios.get('https://maps.googleapis.com/maps/api/directions/json?origin=' + req.body.monitorFrom.replace(/ /g, '+') + '&destination=' + req.body.monitorTo.replace(/ /g, '+') + '&departure_time=now&mode=driving&traffic_model=best_guess&key=' + process.env.INTERNAL_GOOGLE_MAPS_API_KEY)
                    .then(function(responseThere){
                    if (responseThere.data.routes[0] && (responseThere.data.routes[0].legs[0].start_address != responseThere.data.routes[0].legs[0].end_address)) {

                        var start = responseThere.data.routes[0].legs[0].start_address;
                        var end = responseThere.data.routes[0].legs[0].end_address;
                        
                        if(start.substr(start.length - 5) == ", USA") {
                            start = start.substring(0, start.length - 5);
                        }
                        
                        if(end.substr(end.length - 5) == ", USA") {
                            end = end.substring(0, end.length - 5);
                        }


                        Trip.findOne({author: user.id, origin: start, destination: end}).then(function(tripAgain) { 
        
                            if (!tripAgain) { //if a different route comes in then before checked once

                                Trip.findOne({author: user.id, origin: end, destination: start}).then(function(tripAgainBackWards) { 
                
                                    if (!tripAgainBackWards) { //if a different route comes in then before checked backwards

                                        Trip.create({
                                            author: user.id,
                                            origin: start,
                                            destination: end
                                        }).then(function(tripBack){
                                            
                                            axios.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + req.body.monitorFrom.replace(/ /g, '+') + '&key=' + process.env.INTERNAL_GOOGLE_MAPS_API_KEY)
                                              .then(function(responseOriginGeoCode) {
        
                                                Monitor.create({
                                                    trip: tripBack.id,
                                                    author: user.id,
                                                    origin: start,
                                                    destination: end,
                                                    lat: responseOriginGeoCode.data.results[0].geometry.location.lat,
                                                    lng: responseOriginGeoCode.data.results[0].geometry.location.lng,
                                                    start_time_stamp: Date.now()
                                                    
                                                }).then(function(){
                                                    
                                                    res.redirect("/routes");
        
                                                });
                
                                            });
                                            
                                        });


                                    } else { //if the same route comes in as before
        
                                        sentMessage = "Route already monitored.";
                                        res.redirect("/routes");            
        
                                    }
                                });
        

                            } else { //if the same route comes in as before

                                sentMessage = "Route already monitored.";
                                res.redirect("/routes");            

                            }
                        });


                    } else { //address fails, Invalid Address in request

                        sentMessage = "Invalid Address!";
                        res.redirect("/routes");

                    }

                });
                    
            } else { //Only three monitoring allowed at one time
                
                sentMessage = "You can monitor up to three routes.";
                res.redirect("/routes");
                
            }
        });
    });

});


//Delete route from Monitor
app.post("/delete", isLoggedIn, function(req, res){

    User.findOne({username: req.user.username}).then(function(user) {

        Trip.findOne({author: user.id, origin: req.body.deleteFrom, destination: req.body.deleteTo}).remove(function(){
            
            Monitor.findOne({author: user.id, origin: req.body.deleteFrom, destination: req.body.deleteTo}).remove(function(){

                res.redirect("/routes");

            });
        });
    });
});


//catch all else
app.all("*", function(req, res){
    res.redirect("/");
});



//Timer
function scheduler(){
    var d = new Date();
    if (d.getMinutes() % 15 == 0 ) {
  
        //Get all monitors less than 1 week old
        Monitor.find({start_time_stamp: { $gt : Date.now() - 604800000} }).then(function(monitors){
            //For each one

            //Wait two seconds per request because of TimeZoneDB limitations
            var interval = 2000;
            monitors.forEach(function(monitor, index){
                
                setTimeout(function () {

                    //Find the Trip by id
                    Trip.findById(monitor.trip).then(function(trip) {
                        //Check it's lenght to be less than 672
                        if(trip.duration_in_traffic_there.length < 672 && trip.duration_in_traffic_back.length < 672) {
                        //Find out the local day_reading_taken and time_reading_taken there by using the geocode and google geocode api


                            //Local Time There
                            axios.get('http://api.timezonedb.com/v2/get-time-zone?key=' + process.env.INTERNAL_TIMEZONEDB_API_KEY + '&format=json&by=position&lat=' + monitor.lat + '&lng=' + monitor.lng)
                              .then(function(response) {
                        
                                var timeThere = -2;
                                var day_reading_taken = -2;
                                var time_reading_taken = -2;
                                
                                if (response.data.formatted) {
                                    
                                    timeThere = JSON.stringify(response.data.formatted);
                                    timeThere = timeThere.replace(/"/g, '').replace(/ /g, '-').replace(/:/g, '-');
                                    var ta = timeThere.split('-');
                                    var d = new Date(Number(ta[0]), Number(ta[1]) - 1, Number(ta[2]), Number(ta[3]), Number(ta[4]), Number(ta[5]));
                                    day_reading_taken = d.getDay() - 1;
                                    if (day_reading_taken == -1) {
                                        day_reading_taken = 6;
                                    }
                                    time_reading_taken =  ta[3] + ':' + ta[4];
                                    
                                    var ts = time_reading_taken.split(':');
                                
                                    if (Number(ts[1]) <= 14){
                                        time_reading_taken = Number(ts[0]) * 4 + 0;
                                    } else if (Number(ts[1]) > 14 && Number(ts[1]) <= 29 ) {
                                        time_reading_taken = Number(ts[0]) * 4 + 1;
                                    } else if (Number(ts[1]) > 29 && Number(ts[1]) <= 44) {
                                        time_reading_taken = Number(ts[0]) * 4 + 2;
                                    } else {
                                        time_reading_taken = Number(ts[0]) * 4 + 3;
                                    }
                                    
                                }
                                
                                //Find the trips duration there in seconds, then convert it into minutes
                                axios.get('https://maps.googleapis.com/maps/api/directions/json?origin=' + monitor.origin + '&destination=' + monitor.destination + '&departure_time=now&mode=driving&traffic_model=best_guess&key=' + process.env.INTERNAL_GOOGLE_MAPS_API_KEY)
                                  .then(function(responseThere){
                                 
                                    var minutesThere = -2;
                                    if (responseThere.data.routes[0]) {
                                        minutesThere = Math.round(JSON.stringify(responseThere.data.routes[0].legs[0].duration_in_traffic.value) / 60);
                                    }
                                    
                                    //Find the trips duration back in seconds, then convert it into minutes
                                    axios.get('https://maps.googleapis.com/maps/api/directions/json?origin=' + monitor.destination + '&destination=' + monitor.origin + '&departure_time=now&mode=driving&traffic_model=best_guess&key=' + process.env.INTERNAL_GOOGLE_MAPS_API_KEY)
                                      .then(function(responseBack){
                                 
                                        var minutesBack = -2;
                                        if (responseThere.data.routes[0]) {
                                            minutesBack = Math.round(JSON.stringify(responseBack.data.routes[0].legs[0].duration_in_traffic.value) / 60);
                                        }
            
                                        //Validate input values
                                        if (day_reading_taken != -2 && time_reading_taken != -2 && minutesThere != -2 && minutesBack != -2) {
        
                                            //Push the data into trip
                                            trip.duration_in_traffic_there.push(
                                                {
                                                    day_reading_taken: day_reading_taken,
                                                    time_reading_taken: time_reading_taken,
                                                    minutes: minutesThere
                                                });
                
                                            trip.duration_in_traffic_back.push(
                                                {
                                                    day_reading_taken: day_reading_taken,
                                                    time_reading_taken: time_reading_taken,
                                                    minutes: minutesBack
                                                });
                                            
                                            trip.save();
                                        }
            
                                    });                     
            
                                 });
            
                            });
            
                        }
                
                    });    
                    
                }, index * interval);
                
            });
            
        });


        //Delete Finished Monitors (Older than one week)
        Monitor.deleteMany({start_time_stamp: { $lt : Date.now() - 604800000} }, function(){
        });


    }

}

setInterval(scheduler, 60000);


//Keep the app awake on Heroku
setInterval(function() {
    http.get(process.env.APP_URL);
}, 300000); // every 5 minutes (300000)


app.listen(process.env.PORT, process.env.IP, function(){
  console.log("The trafficJazz2 Has Started!");
});

