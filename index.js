var autobahn = require('autobahn');

var wsuri = 'wss://api.poloniex.com';

var connection = new autobahn.Connection({

	url: wsuri,
	realm: 'realm1'

});

connection.onopen = function(session) {

	function marketEvent(args, kwargs) {
		console.log(args);
	}

	session.subscribe('BTC_ETH', marketEvent);

};

connection.onclose = function() {

	console.log('Connection closed');

};

connection.open();
