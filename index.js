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
	this.altcoinBalance = 0;

	// these values are based on order book
	this.realPriceBuy = null;
	this.realPriceSell = 0;

	console.log('=== BOT STARTED ===');
	console.log('current balance: ' + this.balance + ' BTC');
	console.log('===================');

	this.setCurrencyPair();

	setInterval(function() {
		bot.dailyTasks();
	}, 86400 * 1000);
	this.dailyTasks();
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

		} else if (!this.order && this.realPriceBuy <= this.priceToBuy && this.realPriceBuy > this.securityMargin) {

			this.buy();

		} else if (this.order && this.realPriceSell >= this.priceToSell && !this.reachedPriceToSell) {

			this.reachedPriceToSell = true;

		} else if (this.reachedPriceToSell) {

			if (this.identifyLatestPricesDirection() <= 0 || this.differenceFirstLastPrices() <= 0 || this.realPriceSell <= this.priceToSell) {

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
	console.log('final balance: ' + this.balance + ' BTC');
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

Bot.prototype.differenceFirstLastPrices = function() {
	if (this.latestPrices[0] > this.latestPrices[this.latestPrices - 1]) {
		return 1;
	} else if (this.latestPrices[0] < this.latestPrices[this.latestPrices - 1]) {
		return -1;
	} else {
		return 0;
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
};

Bot.prototype.getCurrentTime = function() {
	return new Date().getTime() / 1000;
};

Bot.prototype.getRealPriceToBuy = function() {
	
	var balance = this.balance;

	poloniex.returnOrderBook({currencyPair: config.CURRENCY}, function(err, data) {
		if (data) {
			var asks = data.asks;

			for (ask in asks) {
				var value = asks[ask][0];
				var amount = asks[ask][1];
				
				balance -= value * amount;

				if (balance < 0) {
					bot.realPriceBuy = value;
					bot.tickerUpdate();
					break;
				}
			}
		}
	});
};

Bot.prototype.getRealPriceToSell = function() {

	var altcoinBalance = this.altcoinBalance;

	poloniex.returnOrderBook({currencyPair: config.CURRENCY}, function(err, data) {
		if (data) {
			var bids = data.bids;

			for (bid in bids) {
				var value = bids[bid][0];
				var amount = bids[bid][1];
				
				altcoinBalance -= amount;

				if (altcoinBalance < 0) {
					bot.realPriceSell = value;
					bot.tickerUpdate();
					break;
				}
			}
		}
	});
};

Bot.prototype.dailyTasks = function() {
	this.analyzeBestCurrenciesToTrade();
};

Bot.prototype.analyzeBestCurrenciesToTrade = function() {
	poloniex.returnTicker(function(err, data) {

		var recommendedCurrencies = [];

		if (data) {
			for (var currencyPair in data) {

				// only BTC market now
				if (currencyPair.substr(0, 4) == 'BTC_') {

					var currencyData = data[currencyPair];
					var volume = currencyData.baseVolume;

					if (volume > params.MINIMUM_VOLUME_GOOD_CURRENCY) {
						var variation24h = (100 - (currencyData.high24hr * 100 / currencyData.low24hr)) * -1;

						if (variation24h >= params.MINIMUM_VARIATION_SUGGEST_TRADE) {
							var distanceLow = currencyData.last - currencyData.low24hr;
							var distanceHigh = currencyData.high24hr - currencyData.last;

							if (distanceHigh < distanceLow) {

								currencyData.variation24h = variation24h;

								recommendedCurrencies[currencyPair] = currencyData;
							}
						}
					}
				}
			}

			console.log('=== RECOMMENDED CURRENCIES TO TRADE TODAY ===');
			if (recommendedCurrencies) {
				for (var currencyPair in recommendedCurrencies) {
					var currency = recommendedCurrencies[currencyPair];
					console.log(currencyPair, 'VOL', currency.baseVolume, 'VAR 24h', currency.variation24h.toFixed(2) + '%');
				}
			} else {
				console.log('BOT DIDN\'T DETECT A GOOD CURRENCY FOR TRADING');
			}
			console.log('=============================================');
		}
	});
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

			bot.updateLatestPrices();

			if (bot.order) {
				bot.getRealPriceToSell();
			} else {
				bot.getRealPriceToBuy();
			}
		}
	});
});