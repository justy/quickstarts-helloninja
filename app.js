// quickstarts-helloninja

// Code to accompany http://docs.ninja.is/quickstarts/bootcamp/helloninja.html

// Generic web server stuff see: 
// http://ninjablocks.com/blogs/how-to/7639075-deploy-a-node-app-to-heroku
// for more information on how to create this.

// ------ START OF GENERIC WEB APP STUFF ----------

var express = require('express')
, routes = require('./routes')
, user = require('./routes/user')
, http = require('http')
, path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


// ------ END OF GENERIC WEB APP STUFF ----------

// Name your sensors and actuators on the Dashboard 
// and set the variables here appropriately

var rf433_short_name = "Office Ninja" ; //"RF433 MHz";
var temperature_short_name = "Office Temp"; //My Temperature and Humidity Sensor";
var button_short_name = "My Button";
var actuator_on_short_name = "Socket 1 On"; //My Actuator Turn On";
var actuator_off_short_name = "Socket 1 Off"; //"My Actuator Turn Off";
var ninas_eyes_short_name = "Office Eyes"; //Nina\'s Eyes"

// The host where we'll deploy our apps
var HOSTNAME = "https://yourappname.com";

// Transitional temperatures.  We use two to avoid hysteresis
var transitional_temperature_on = 28;
var transitional_temperature_off = 26;
var current_temperature = 0;

// Maintain a variable that represents the state of our room
var app_mode = 'off';

// Include our underscore and ninja-blocks libraries
var ninjaBlocks = require('ninja-blocks');

// Instantiate a ninja object with your API token from https://a.ninja.is/hacking
var ninja = ninjaBlocks.app({user_access_token:"YOUR_TOKEN"});

// Import Underscore
var _ = require('underscore');

// Pull out our desired devices by their short name.
// We will have 2 devices and 3 subdevices

// Nina's Eyes Device
var eyes_device_key;

// Temperature Sensor Device
var temperature_device_key;

// RF Device
var rf_device_key;

// List of RF subdevices
var rf_subdevice_list = {};

ninja.devices(function(err, devices) {

  // Create a convenience device and subdevice map keyed on shortname
  _.each(devices, function(device, key){

    // You might find this line handy at first
    //console.log("Device's short name: ", device.shortName);

    // Nina's Eyes
    if (device.shortName == ninas_eyes_short_name) {
      console.log("Found Nina\'s Eyes: ", key);
      eyes_device_key = key;
    }

    // Temperature sensor
    if (device.shortName == temperature_short_name) {
      console.log("Found Temperature Sensor: ", key);
      temperature_device_key = key;
    }
    
    // RF Goodness
    if (device.shortName == rf433_short_name) {

      // RF433 device
      console.log("Found your RF433: ", key);
      rf_device_key = key;

      // Found our RF433 device, subscribe to it and get its subdevices
      //console.log("Subscribing to " + HOSTNAME + '/rf');
      ninja.device(rf_device_key).subscribe(HOSTNAME+'/rf',true,function(err){
          // Handle errors
          if (err) {
            console.log("Error subscribing: ", err);
          }
        });

      _.each(device.subDevices,function(subdevice){

        // Add the subdevice as a value for a key in a hash.
        rf_subdevice_list[subdevice.shortName] = subdevice.data;

      }); // Each subdevice  

      // Uncomment this if you find it useful
      //console.log("Subdevices: ", rf_subdevice_list);
    } // is rf433 
  }); // each device

}); // ninja.devices

// Now this is done we can access our devices like so:

// Set Nina's eyes to red:
// ninja.device(eyes_device_gid).actuate('FF0000');

// Turn the actuator on:
// ninja.device(rf_device_gid).actuate(rf_subdevice_list[actuator_on_short_name]);

// Run our app on a simple 1 second idle loop
setInterval(idleApp, 1000);

function idleApp() {
  // Run our app's logic

  switch (app_mode) {

    case 'off':
    // Nothing to do; actuator stays on and our route handles the button press
    break;

    case 'on':
    // Nothing to do; actuator stays on and our route handles the button press
    break;

    case 'auto':
    
    ninja.device(temperature_device_key).last_heartbeat(function(err, data) {
        current_temperature = data.DA;
    });
    //var current_temperature = ninja.devices[temperature_device_key].last_data.DA;

    console.log("Temperature is: ", current_temperature);

    if (current_temperature > transitional_temperature_on) {
      // Switch our actuator on
      ninja.device(rf_device_key).actuate(rf_subdevice_list[actuator_on_short_name]);
    }

    if (current_temperature < transitional_temperature_off) {
      // Switch our actuator off
      ninja.device(rf_device_key).actuate(rf_subdevice_list[actuator_off_short_name]);
    }
    
    break;
  } // switch

} // idleApp


// Implement our rf route
app.post('/rf' , function(req, res){
console.log('posted: ', req.body.DA);

  // Accept the RF input, filtering out the button we are after
  if (req.body.DA == rf_subdevice_list[button_short_name]) {
  console.log("Button was pressed");  

    //console.log("rf device key is: ", rf_device_key);

    // Change mode

    switch (app_mode) {

      case 'off':
        console.log("Was off, turning on");
        // Switch to mode 'on', turning on the socket
        app_mode = 'on';
        ninja.device(rf_device_key).actuate(rf_subdevice_list[actuator_on_short_name]);
        // Update Nina's eyes
        updateEyes(app_mode);
      break;

      case 'on':
        console.log("Was on, going auto");
        // Switch to mode 'auto'.  No need to actuate anything here.
        app_mode = 'auto';
        // Update Nina's eyes
        updateEyes(app_mode);
      break;

      case 'auto':
        console.log("Was auto, turning off");
        // Switch to mode 'off', turning off the socket
        app_mode = 'off';
        ninja.device(rf_device_key).actuate(rf_subdevice_list[actuator_off_short_name]);
        // Update Nina's eyes
        updateEyes(app_mode);
      break;
    } // switch

  } // if

res.send(200);
});

// Update Nina's Eyes
function updateEyes(mode) {

  switch (mode) {

    case 'off':
      ninja.device(eyes_device_key).actuate('0000FF');
    break;

    case 'on':
      ninja.device(eyes_device_key).actuate('FF0000');
    break;

    case 'auto':
      ninja.device(eyes_device_key).actuate('FFFFFF');
    break;

  }

}
