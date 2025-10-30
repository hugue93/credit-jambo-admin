"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const transactionService_1 = require("../services/transactionService");
exports.transactionRouter = (0, express_1.Router)();
exports.transactionRouter.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const data = await (0, transactionService_1.listTransactions)(req.userId);
        res.json(data);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Error' });
    }
});
exports.transactionRouter.post('/deposit', auth_1.requireAuth, async (req, res) => {
    try {
        const input = transactionService_1.TxSchema.parse({ userId: req.userId, amount: req.body.amount });
        const result = await (0, transactionService_1.deposit)(input);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
exports.transactionRouter.post('/withdraw', auth_1.requireAuth, async (req, res) => {
    try {
        const input = transactionService_1.TxSchema.parse({ userId: req.userId, amount: req.body.amount });
        const result = await (0, transactionService_1.withdraw)(input);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
