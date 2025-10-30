"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const accountService_1 = require("../services/accountService");
exports.accountRouter = (0, express_1.Router)();
exports.accountRouter.get('/balance', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await (0, accountService_1.getBalance)(req.userId);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Error' });
    }
});
