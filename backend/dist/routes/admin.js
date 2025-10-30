"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const firebase_1 = require("../utils/firebase");
const crypto_1 = require("../utils/crypto");
const jwt_1 = require("../utils/jwt");
exports.adminRouter = (0, express_1.Router)();
const AdminLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email().toLowerCase().trim(),
    password: zod_1.z.string().min(8),
});
const adminsCol = () => firebase_1.firestore.collection('admins');
const devicesCol = () => firebase_1.firestore.collection('devices');
exports.adminRouter.post('/login', async (req, res) => {
    try {
        const input = AdminLoginSchema.parse(req.body);
        const snap = await adminsCol().where('email', '==', input.email).limit(1).get();
        if (snap.empty)
            return res.status(400).json({ message: 'Invalid credentials' });
        const admin = snap.docs[0].data();
        const pepper = process.env.PASSWORD_PEPPER || '';
        const hash = (0, crypto_1.sha512WithPepper)(input.password, pepper);
        if (hash !== admin.passwordSha512)
            return res.status(400).json({ message: 'Invalid credentials' });
        const token = (0, jwt_1.signJwt)({ sub: admin.id, role: 'admin' }, '30m');
        res.json({ token });
    }
    catch (e) {
        res.status(400).json({ message: e.message || 'Invalid input' });
    }
});
exports.adminRouter.get('/devices/pending', async (_req, res) => {
    const snap = await devicesCol().where('verifiedAt', '==', null).limit(100).get();
    res.json(snap.docs.map(d => d.data()));
});
exports.adminRouter.post('/devices/:id/verify', async (req, res) => {
    const id = req.params.id;
    const ref = devicesCol().doc(id);
    const doc = await ref.get();
    if (!doc.exists)
        return res.status(404).json({ message: 'Device not found' });
    await ref.update({ verifiedAt: new Date() });
    res.json({ message: 'Device verified' });
});
