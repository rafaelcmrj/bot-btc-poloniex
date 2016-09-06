/**
 * Importing Modules
 */
var poloniex = require('plnx');

/**
 * Importing file dependencies
 */
var config = require('./config.js');
var params = require('./params.js');

/** Trade values */
var last, lowestAsk, highestBid, percentChange, baseVolume, quoteVolume, isFrozen, high24hr, low24hr;

/** Order values */
var order = null;

/** Start trading (!!!) */
poloniex.push(function(session) {
	session.subscribe('ticker', function(data){
		if (data[0] == config.CURRENCY) {
			last = data[1];
			lowestAsk = data[2];
			highestBid = data[3];
			percentChange = data[4] * 100;
			baseVolume = data[5];
			quoteVolume = data[6];
			isFrozen = data[7];
			high24hr = data[8];
			low24hr = data[9];

			onTickerUpdate();
		}
	});
});

function onTickerUpdate() {

	console.log('ticker update', last, percentChange + '%');

	if (order) {
		console.log('price variation', last * order.price / 100);
	}

	if (!order && percentChange > 0) {
		console.log('bought at:', last);
		order = {
			price: last,
			amount: 1000
		}
	} else if (order && last > order.price * 1.025) {
		console.log('sold at:', last);
		order = null;
	}
}