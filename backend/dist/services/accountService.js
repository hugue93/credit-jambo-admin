"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = getBalance;
const firebase_1 = require("../utils/firebase");
const accountsCol = () => firebase_1.firestore.collection('accounts');
async function getBalance(userId) {
    const accountSnap = await accountsCol().where('userId', '==', userId).limit(1).get();
    if (accountSnap.empty)
        throw new Error('Account not found');
    const account = accountSnap.docs[0].data();
    return { balance: account.balance };
}
