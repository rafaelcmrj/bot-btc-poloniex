/**
 * Importing Modules
 */
var autobahn = require('autobahn');
var request = require('request');

/**
 * Importing file dependencies
 */
var config = require('./config.js');
var params = require('./params.js');

/** Trade values */
var lastPrice, higherPrice24h, lowerPrice24h;

/**
 * Connection attributes
 */
var connection = new autobahn.Connection({
  url: config.POLONIEX_WEBSERVICE_URL,
  realm: "realm1"
});


connection.onopen = function(session) {

	session.subscribe(config.CURRENCY, function(args, kwargs) {
		for (var i in args) {
			var action = args[i];
			if (action.type == 'newTrade') {
				lastPrice = action.data.rate;
			}
		}
	});
	
	/*callPoloniexAPI('returnOrderBook', function(error, response, body) {

	});*/
}

function callPoloniexAPI(command, callback) {
	var options = {
		method: 'GET',
		url: config.POLONIEX_PUBLIC_API_URL,
		qs: {
			command: command,
			currencyPair: config.CURRENCY
		},
		json: true
	};

	request(options, callback);
}

connection.onclose = function () {
  console.log("Websocket connection closed");
}
		       
connection.open();