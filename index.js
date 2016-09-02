/**
 * Importing Modules
 */
var autobahn = require('autobahn');
var request = require('request');

/**
 * Importing file dependencies
 */
var config = require('./config.js');

/**
 * Connection attributes
 */
var Connection = new autobahn.Connection({
  url: config.POLONIEX_WEBSERVICE_URL,
  realm: "realm1"
});


connection.onopen = function(session) {

	console.log('on open');

	callPoloniexAPI('returnOrderBook', function(error, response, body) {
		console.log(body);
	});

	callPoloniexAPI('returnBalances', function(error, response, body) {
		console.log(body);
	});
	//
	
	/*session.subscribe('BTC_ETH', function(args, kwargs){
		console.log(args);
		console.log('*******');
	});*/

}

function callPoloniexAPI(command, callback) {
	var options = {
		method: 'GET',
		url: config.POLONIEX_PUBLIC_API_URL,
		qs: {
			command: command,
			currencyPair: 'BTC_ETH'
		},
		json: true
	};

	request(options, callback);
}

connection.onclose = function () {
  console.log("Websocket connection closed");
}
		       
connection.open();