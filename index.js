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
var lastBasePrice = null;
var priceToBuy = null;
var priceToSell = null;
var securityMargin = null;

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

	if (!lastBasePrice) {
		lastBasePrice = last;
		priceToBuy = lastBasePrice * ((100 - params.MARGIN_TO_BUY) / 100);
		securityMargin = lastBasePrice * ((100 - params.SECURITY_MARGIN) / 100);
		
		console.log('lastBasePrice:', lastBasePrice, ' / priceToBuy:', priceToBuy);
	}

	if (!order && last <= priceToBuy && last > securityMargin) {

		buy();

	} else if (order && last >= priceToSell) {

		sell();

	} else if (order && last <= securityMargin) {

		console.log('currency decreased a lot. gonna sell for security margin');

		sell();
	}
}

function sell() {
	console.log('sold at:', last);
	order = null;
	lastBasePrice = null;
	priceToBuy = null;
	priceToSell = null;
}

function buy() {
	console.log('bought at:', last);
	order = { price: last };

	priceToSell = order.price * ((100 + params.MARGIN_TO_SELL) / 100);
	securityMargin = lastBasePrice * ((100 - params.SECURITY_MARGIN) / 100);

	console.log('priceToSell:', priceToSell, ' / securityMargin:', securityMargin);
}