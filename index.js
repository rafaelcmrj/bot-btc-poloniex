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

var Bot = function() {

	this.order = null;
	this.lastBasePrice = null;
	this.priceToBuy = null;
	this.priceToSell = null;
	this.securityMargin = null;

};

Bot.prototype.tickerUpdate = function() {
	if (!this.lastBasePrice) {
		this.lastBasePrice = last;
		this.priceToBuy = this.lastBasePrice * ((100 - params.MARGIN_TO_BUY) / 100);
		this.securityMargin = this.lastBasePrice * ((100 - params.SECURITY_MARGIN) / 100);
		
		console.log('lastBasePrice:', this.lastBasePrice, ' / priceToBuy:', this.priceToBuy);
	}

	if (!this.order && last <= this.priceToBuy && last > this.securityMargin) {

		this.buy();

	} else if (order && last >= priceToSell) {

		this.sell();

	} else if (this.order && last <= this.securityMargin) {

		console.log('currency decreased a lot. gonna sell for security margin');

		this.sell();
	}
};

Bot.prototype.buy = function() {
	console.log('bought at:', last);

	this.order = { price: last };
	this.priceToSell = this.order.price * ((100 + params.MARGIN_TO_SELL) / 100);
	this.securityMargin = this.lastBasePrice * ((100 - params.SECURITY_MARGIN) / 100);

	console.log('priceToSell:', this.priceToSell, ' / securityMargin:', this.securityMargin);
};

Bot.prototype.sell = function() {

	console.log('sold at:', last);

	console.log('*** LAST ORDER ***');
	console.log('BOUGHT AT:', order.price);
	console.log('SOLD AT:', last);
	console.log('PROFIT:', (last * 100 / order.price - 100) + '%');
	console.log('*** END SUMMARY ***');

	this.order = null;
	this.lastBasePrice = null;
	this.priceToBuy = null;
	this.priceToSell = null;
};

/** Start trading (!!!) */
var bot = new Bot();

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

			bot.tickerUpdate();
		}
	});
});