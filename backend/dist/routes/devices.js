"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceRouter = void 0;
const express_1 = require("express");
const deviceService_1 = require("../services/deviceService");
exports.deviceRouter = (0, express_1.Router)();
exports.deviceRouter.post('/register', async (req, res) => {
    try {
        const input = deviceService_1.DeviceRegisterSchema.parse(req.body);
        const result = await (0, deviceService_1.registerDevice)(input);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
exports.deviceRouter.post('/register-by-email', async (req, res) => {
    try {
        const input = deviceService_1.DeviceRegisterByEmailSchema.parse(req.body);
        const result = await (0, deviceService_1.registerDeviceByEmail)(input);
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
