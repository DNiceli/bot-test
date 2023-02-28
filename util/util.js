const { Users } = require('../dbObjects');

async function addBalance(id, amount, currency) {
    const user = currency.get(id);
    console.log('using addBalance');

    if (user) {
        user.balance += Number(amount);
        return user.save();
    }

    const newUser = await Users.create({ user_id: id, balance: amount });
    currency.set(id, newUser);

    return newUser;
}

function getBalance(id, currency) {
    console.log('using getBalance');
    const user = currency.get(id);
    return user ? user.balance : 0;
}

module.exports = {
    addBalance,
    getBalance
};