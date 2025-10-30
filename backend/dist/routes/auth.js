"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authService_1 = require("../services/authService");
const jwt_1 = require("../utils/jwt");
const passwordResetService_1 = require("../services/passwordResetService");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', async (req, res) => {
    try {
        const input = authService_1.RegisterSchema.parse(req.body);
        const result = await (0, authService_1.registerUser)(input);
        res.status(201).json(result);
    }
    catch (e) {
        const msg = e?.message || 'Invalid input';
        const status = typeof msg === 'string' && msg.toLowerCase().includes('email already registered')
            ? 409
            : 400;
        res.status(status).json({ message: msg });
    }
});
exports.authRouter.post('/forgot-password', async (req, res) => {
    try {
        const input = passwordResetService_1.ForgotSchema.parse(req.body);
        const result = await (0, passwordResetService_1.requestPasswordReset)(input);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
exports.authRouter.post('/reset-password', async (req, res) => {
    try {
        const input = passwordResetService_1.ResetSchema.parse(req.body);
        const result = await (0, passwordResetService_1.resetPassword)(input);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
exports.authRouter.post('/login', async (req, res) => {
    try {
        const input = authService_1.LoginSchema.parse(req.body);
        const { userId } = await (0, authService_1.loginUser)(input);
        const token = (0, jwt_1.signJwt)({ sub: userId, deviceId: input.deviceId }, '15m');
        res.json({ token });
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid credentials' });
    }
});
