var params = {

    MAX_TRADE_PER_ORDER: 20, // max of your total balance you want to trade per order (bot won't buy more than that per_order value)

    LIMIT_FALL_TO_SELL: 30, // your limit to sell when the currency decreases (in percentage). example: if the currency decreases 10% in X minutes (varible below), sell your BALANCE
    LIMIT_FALL_TO_SELL_TIME: 10, // time to analyize your limit to sell (in minutes)

    MARGIN_SELL: 20, // if the price decreases x%, sell your amount
    MARGIN_SELL_GROWING: 0, // sell when price is growing but begin to decrease

    TIME_TO_BUY_DROPPING: 0, // but will buy when: 0 = price reach lowest price in 10m; 1 = lowest price in 1h; 2 = lowest price in 3h; 3 = lowest price in 12h; 4 = lowest price in 24h; 5 = lowest price in 72h; 6 = lowest price in one week; 7 = lowest price in one month
    TIME_TO_BUY_GROWING: 0, // bot will buy when: 0 = price reach highest price in 10m; 1 = highest price in 1h; 2 = highest price in 3h; 3 = highest price in 12h; 4 = highest price in 24h; 5 = highest price in 72h; 6 = highest price in one week; 7 = highest price in one month

};

module.exports = params;


// selling uses bid
// buying uses asks