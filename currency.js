const { Users } = require('./dbObjects.js');

const currency = new Map();

async function populateCurrency() {
    const storedBalances = await Users.findAll();
    storedBalances.forEach(b => currency.set(b.user_id, b));
}

populateCurrency();

module.exports = currency;