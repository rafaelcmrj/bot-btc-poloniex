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
	
	this.canBuy = false;
	this.waitingOrderCallback = false;
	this.hasOpenedOrders = false;

	this.balance = 0;
	this.altcoinBalance = 0;

	this.loadBalance();
};

Bot.prototype.loadBalance = function() {

	poloniex.returnCompleteBalances({key: config.KEY, secret: config.SECRET}, function(err, data) {
		if (err) {

			console.log('=== ERROR ===');
			console.log('There was an error to retrieve your balance. Verify your API Key and try again.');
			console.log('=============');
			console.log('');
		} else {

			console.log(data.BTC);

			var availableBalance = Number(data.BTC.available).toFixed(8);
			var onOrderBalance = Number(data.BTC.onOrders).toFixed(8);

			if (availableBalance || onOrderBalance) {

				if (onOrderBalance > 0) {

					console.log('=== ERROR ===');
					console.log('You already have orders, please remove these orders to start trading.');
					console.log('=============');
					console.log('');
				} else {

					bot.balance = availableBalance;
					bot.canBuy = true;
					bot.startBot();
				}

			} else {

				console.log('=== ERROR ===');
				console.log('You don\'t have enough BTC balance.');
				console.log('=============');
				console.log('');
			}
		}
	});
};

Bot.prototype.startBot = function() {
	
	console.log('=== BOT STARTED ===');
	console.log('current balance: ' + this.balance + ' BTC');
	console.log('===================');
	console.log('');
	
	this.setCurrencyPair();
	this.initTasks();
	this.subscribeToTicker();
};

Bot.prototype.setCurrencyPair = function() {

	if (process.argv[2]) {
		config.CURRENCY = process.argv[2]; 
	}
};

Bot.prototype.initTasks = function() {
	
	this.dailyTasks();

	// set interval for daily tasks
	setInterval(function() { 
		bot.dailyTasks();
	}, 86400 * 1000);
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
			console.log('');
		}
	});
};

Bot.prototype.subscribeToTicker = function() {

	poloniex.push(function(session) {

		session.subscribe('ticker', function(data) {

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
};

Bot.prototype.updateLatestPrices = function() {

	this.latestPrices.unshift(last);

	if (this.latestPrices.length > params.MAX_LATEST_PRICES) {

		this.latestPrices.pop();
	}
};

Bot.prototype.tickerUpdate = function() {

	if (this.waitingGrow) {

		if (this.identifyLatestPricesDirection() > 0) {

			this.waitingGrow = false;
		}

	} else {

		if (this.hasOpenedOrders) {

			this.verifyOpenOrders();
		} else {

			if (!this.basePrice || (this.lastBasePriceUpdate && this.getCurrentTime() - this.lastBasePriceUpdate > params.TIME_DELAY_PRICE)) {

				this.basePrice = last;
				this.priceToBuy = (this.basePrice * ((100 - params.MARGIN_TO_BUY) / 100)).toFixed(8);
				this.securityMargin = (this.basePrice * ((100 - params.SECURITY_MARGIN) / 100)).toFixed(8);
				this.lastBasePriceUpdate = this.getCurrentTime();
				
				console.log('=== PRICE INFORMATION ===');
				console.log('base price: ' + this.basePrice);
				console.log('price target to buy: ' + this.priceToBuy);
				console.log('=========================');
				console.log('');

			} else if (!this.order && last <= this.priceToBuy && last > this.securityMargin && this.canBuy) {

				this.buy();

			} else if (this.order && last >= this.priceToSell && !this.reachedPriceToSell) {

				this.reachedPriceToSell = true;

			} else if (this.reachedPriceToSell) {

				if (this.identifyLatestPricesDirection() <= 0 || this.differenceFirstLastPrices() <= 0 || last <= this.priceToSell) {

					this.sell();
				}

			} else if (this.order && last <= this.securityMargin) {

				console.log('=== SECURITY MARGIN REACHED ===');
				console.log('Currency decreased to the security level you have defined. Bot will sell all your coins and wait until currency recover its value');
				console.log('===============================');
				console.log('');

				this.waitingGrow = true;

				this.sell();
			}
		}
	}
};

Bot.prototype.verifyOpenOrders = function() {

	if (this.hasOpenedOrders) {

		poloniex.returnOpenOrders({
			currencyPair: config.CURRENCY,
			key: config.KEY,
			secret: config.SECRET
		}, function(err, data) {

			if (!err && data) {

				if (data.length == 0) {

					var currencyPair = config.CURRENCY.split('_');
					var currencyB = currencyPair[1];

					poloniex.returnCompleteBalances({key: config.KEY, secret: config.SECRET}, function(err, data) {

						if (!err && data) {

							this.altcoinBalance = data[currencyB].available;

							bot.hasOpenedOrders = false;
							bot.canBuy = true;

						} else {
							console.log('*** POLONIEX CALLBACK ***');
							console.log(err);
							console.log('*************************');
							console.log('');
						}

					});
				}
			} else {
				console.log('*** POLONIEX CALLBACK ***');
				console.log(err);
				console.log('*************************');
				console.log('');
			}
		});
	}
};

Bot.prototype.buy = function() {

	if (this.canBuy && !this.waitingOrderCallback) {

		this.waitingOrderCallback = true;

		var rate = last;
		var amount = this.balance / last; 

		poloniex.buy({
			currencyPair: config.CURRENCY,
			rate: last,
			amount: this.balance / last,
			key: config.KEY,
			secret: config.SECRET
		}, function(err, data) {

			bot.waitingOrderCallback = false;

			if (!err && data) {

				console.log('*** POLONIEX CALLBACK ***');
				console.log(data);
				console.log('*************************');
				console.log('');
				
				bot.canBuy = false;

				bot.order = {
					rate: rate,
					amount: amount,
					orderNumber: data.orderNumber
				};

				bot.hasOpenedOrders = true;

				bot.priceToSell = (bot.order.rate * ((100 + params.MARGIN_TO_SELL) / 100)).toFixed(8);
				bot.securityMargin = (bot.basePrice * ((100 - params.SECURITY_MARGIN) / 100)).toFixed(8);

				console.log('=== ORDER INFORMATION ===');
				console.log('type: BUY');
				console.log('price: ' + bot.order.rate);
				console.log('target to sell: ' + bot.priceToSell);
				console.log('security margin: ' + bot.securityMargin);
				console.log('==========================');
				console.log('');
			} else {
				console.log('*** POLONIEX CALLBACK ***');
				console.log(err);
				console.log('*************************');
				console.log('');
			}
		});
	}
};

Bot.prototype.sell = function() {

	if (!this.waitingOrderCallback) {

		this.waitingOrderCallback = true;

		var currencies = config.CURRENCY.split('_');
		var currencyPair = currencies[1] + '_' + currencies[0];

		poloniex.sell({
			currencyPair: currencyPair,
			rate: last,
			amount: this.altcoinBalance,
			key: config.KEY,
			secret: config.SECRET
		}, function(err, data) {

			bot.waitingOrderCallback = false;

			if (!err && data) {
				
				console.log('*** POLONIEX CALLBACK ***');
				console.log(data);
				console.log('*************************');
				console.log('');

				console.log('=== ORDER INFORMATION ===');
				console.log('type: SELL');
				console.log('price: ' + last);
				console.log('profit: ' + (last * 100 / bot.order.rate - 100).toFixed(2) + '%');
				console.log('final balance: ' + bot.balance + ' BTC');
				console.log('==========================');
				console.log('');

				bot.hasOpenedOrders = true;

				bot.order = null;
				bot.basePrice = null;
				bot.priceToBuy = null;
				bot.priceToSell = null;
				bot.reachedPriceToSell = false;
			} else {
				console.log('*** POLONIEX CALLBACK ***');
				console.log(err);
				console.log('*************************');
				console.log('');
			}
		});
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


/** Start trading (!!!) */
var bot = new Bot();