"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxSchema = void 0;
exports.listTransactions = listTransactions;
exports.deposit = deposit;
exports.withdraw = withdraw;
const firebase_1 = require("../utils/firebase");
const zod_1 = require("zod");
const accountsCol = () => firebase_1.firestore.collection('accounts');
const transactionsCol = () => firebase_1.firestore.collection('transactions');
exports.TxSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
});
async function listTransactions(userId) {
    const txSnap = await transactionsCol()
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    return txSnap.docs.map(d => d.data());
}
async function deposit(input) {
    const { userId, amount } = exports.TxSchema.parse(input);
    await firebase_1.firestore.runTransaction(async (tx) => {
        const accountSnap = await tx.get(accountsCol().where('userId', '==', userId).limit(1));
        if (accountSnap.empty)
            throw new Error('Account not found');
        const accountDoc = accountSnap.docs[0];
        const account = accountDoc.data();
        const newBalance = (account.balance || 0) + amount;
        tx.update(accountDoc.ref, { balance: newBalance });
        const txRef = transactionsCol().doc();
        tx.set(txRef, {
            id: txRef.id,
            userId,
            type: 'deposit',
            amount,
            balanceAfter: newBalance,
            createdAt: new Date(),
        });
    });
    return { message: 'Deposit successful' };
}
async function withdraw(input) {
    const { userId, amount } = exports.TxSchema.parse(input);
    await firebase_1.firestore.runTransaction(async (tx) => {
        const accountSnap = await tx.get(accountsCol().where('userId', '==', userId).limit(1));
        if (accountSnap.empty)
            throw new Error('Account not found');
        const accountDoc = accountSnap.docs[0];
        const account = accountDoc.data();
        const current = account.balance || 0;
        if (amount > current)
            throw new Error('Insufficient funds');
        const newBalance = current - amount;
        tx.update(accountDoc.ref, { balance: newBalance });
        const txRef = transactionsCol().doc();
        tx.set(txRef, {
            id: txRef.id,
            userId,
            type: 'withdraw',
            amount,
            balanceAfter: newBalance,
            createdAt: new Date(),
        });
    });
    return { message: 'Withdrawal successful' };
}
