/**
 * Importing Modules
 */
var poloniex = require('plnx');
var nodemailer = require('nodemailer');

/**
 * Importing file dependencies
 */
var config = require('./config.js');
var params = require('./params.js');

/** Trade values */
var last, lowestAsk, highestBid, percentChange, baseVolume, quoteVolume, isFrozen, high24hr, low24hr;

var Bot = function() {

	this.order = null;
	this.basePrice = null;
	this.priceToBuy = null;
	this.priceToSell = null;
	this.securityMargin = null;
	this.reachedPriceToSell = false;
	this.latestPrices = [];
	this.waitingGrow = false;
	this.lastBasePriceUpdate = null;

	// BTC Balance only for tests
	this.balance = params.BTC_BALANCE;

	console.log('=== BOT STARTED ===');
	console.log('current balance: ' + this.balance + 'BTC');
	console.log('===================');

	this.setCurrencyPair();

};

Bot.prototype.setCurrencyPair = function() {
	if (process.argv[2]) {
		config.CURRENCY = process.argv[2]; 
	}
};

Bot.prototype.tickerUpdate = function() {

	if (this.waitingGrow) {

		if (this.identifyLatestPricesDirection() > 0) {

			this.waitingGrow = false;
		}

	} else {

		if (!this.basePrice || (this.lastBasePriceUpdate && this.getCurrentTime() - this.lastBasePriceUpdate > params.TIME_DELAY_PRICE)) {

			this.basePrice = last;
			this.priceToBuy = this.basePrice * ((100 - params.MARGIN_TO_BUY) / 100);
			this.securityMargin = this.basePrice * ((100 - params.SECURITY_MARGIN) / 100);
			this.lastBasePriceUpdate = this.getCurrentTime();
			
			console.log('=== PRICE INFORMATION ===');
			console.log('base price: ' + this.basePrice);
			console.log('price target to buy: ' + this.priceToBuy);
			console.log('=========================');

		} else if (!this.order && last <= this.priceToBuy && last > this.securityMargin) {

			this.buy();

		} else if (this.order && last >= this.priceToSell && !this.reachedPriceToSell) {

			this.reachedPriceToSell = true;

		} else if (this.reachedPriceToSell) {

			if (this.identifyLatestPricesDirection() < 0 || last <= this.priceToSell) {

				this.sell();
			}

		} else if (this.order && last <= this.securityMargin) {

			console.log('=== SECURITY MARGIN REACHED ===');
			console.log('Currency decreased to the security level you have defined. Bot will sell all your coins and wait until currency recover its value');
			console.log('===============================');

			this.waitingGrow = true;
			this.sell();

		}
	}
};

Bot.prototype.buy = function() {
	
	this.order = { price: last };
	this.priceToSell = this.order.price * ((100 + params.MARGIN_TO_SELL) / 100);
	this.securityMargin = this.basePrice * ((100 - params.SECURITY_MARGIN) / 100);

	console.log('=== ORDER INFORMATION ===');
	console.log('type: BUY');
	console.log('price: ' + last);
	console.log('target to sell: ' + this.priceToSell);
	console.log('security margin: ' +this.securityMargin);
	console.log('==========================');
};

Bot.prototype.sell = function() {

	this.balance = this.balance / this.order.price * last;

	console.log('=== ORDER INFORMATION ===');
	console.log('type: SELL');
	console.log('price: ' + last);
	console.log('profit: ' + (last * 100 / this.order.price - 100) + '%');
	console.log('final balance: ' + this.balance + 'BTC');
	console.log('==========================');

	this.order = null;
	this.basePrice = null;
	this.priceToBuy = null;
	this.priceToSell = null;
	this.reachedPriceToSell = false;
};

Bot.prototype.updateLatestPrices = function() {
	this.latestPrices.unshift(last);

	if (this.latestPrices.length > params.MAX_LATEST_PRICES) {
		this.latestPrices.pop();
	}
};

Bot.prototype.identifyLatestPricesDirection = function() {
	
	// return positive or negative (> 0 = growing, < 0 = falling)
	var direction = 0;

	for (var i = 0; i < this.latestPrices.length - 1; i++) {
		var price = this.latestPrices[i];
		var previousPrice = this.latestPrices[i+1];

		if (price > previousPrice) {
			direction++;
		} else if (price < previousPrice) {
			direction--;
		}
	}

	return direction;
}

Bot.prototype.getCurrentTime = function() {
	return new Date().getTime() / 1000;
}

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

			bot.updateLatestPrices();
			bot.tickerUpdate();
		}
	});
});