var params = {

    MARGIN_TO_SELL: 2, // margin to sell when currency increases its value (example: sell when currency increases 2.5% of paid value)
    MARGIN_TO_BUY: 4, // margin to buy when currency decreases its value (example: buy when currency decreases 5% of last order)
    SECURITY_MARGIN: 10, // sell all balance if currency decreases x% after you bought it
    MAX_LATEST_PRICES: 15, // limit of latest prices to analyze to determine if price is growing or falling
    TIME_DELAY_PRICE: 3600, // time, in seconds, to verify margin price again if price freezes

    BTC_BALANCE: 2 // btc balance for test purposes

};

module.exports = params;


// selling uses bid
// buying uses asks