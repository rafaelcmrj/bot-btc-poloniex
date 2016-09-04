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
var last, lowestAsk, highestBid, percentChange, baseVolume, quoteVolume, isFrozen, high24hr, low24hr;

/**
 * Connection attributes
 */
var connection = new autobahn.Connection({
  url: config.POLONIEX_WEBSERVICE_URL,
  realm: "realm1"
});


connection.onopen = function(session) {

	session.subscribe('ticker', function(args, kwargs) {

		if (args[0] == config.CURRENCY) {
			last = args[1];
			lowestAsk = args[2];
			highestBid = args[3];
			percentChange = args[4] * 100;
			baseVolume = args[5];
			quoteVolume = args[6];
			isFrozen = args[7];
			high24hr = args[8];
			low24hr = args[9];
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