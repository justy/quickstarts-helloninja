// Maintain a variable that represents the state of our room
var room_state = 'unknown';

// Include our underscore and ninja-blocks libraries
var ninjaBlocks = require('ninja-blocks');

// Instantiate a ninja object with your API token from https://a.ninja.is/hacking
var ninja = ninjaBlocks.app({user_access_token:"USER_ACCESS_TOKEN"});

// 