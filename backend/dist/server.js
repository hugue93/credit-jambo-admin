"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
require("./utils/env");
const auth_1 = require("./routes/auth");
const admin_1 = require("./routes/admin");
const account_1 = require("./routes/account");
const transactions_1 = require("./routes/transactions");
const devices_1 = require("./routes/devices");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean), credentials: true }));
app.use(express_1.default.json());
const globalLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(globalLimiter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Basic request logging (method, url)
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use('/auth', auth_1.authRouter);
app.use('/account', account_1.accountRouter);
app.use('/transactions', transactions_1.transactionRouter);
app.use('/devices', devices_1.deviceRouter);
app.use('/admin', admin_1.adminRouter);
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
