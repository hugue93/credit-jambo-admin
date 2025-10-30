"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSchema = exports.RegisterSchema = void 0;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const firebase_1 = require("../utils/firebase");
const crypto_1 = require("../utils/crypto");
const zod_1 = require("zod");
const usersCol = () => firebase_1.firestore.collection('users');
const accountsCol = () => firebase_1.firestore.collection('accounts');
const devicesCol = () => firebase_1.firestore.collection('devices');
const passwordPolicy = zod_1.z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a digit')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character');
exports.RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120).trim(),
    email: zod_1.z.string().email().trim().toLowerCase(),
    phone: zod_1.z.string().min(7).max(20).trim(),
    password: passwordPolicy,
    deviceId: zod_1.z.string().min(8)
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email().trim().toLowerCase(),
    password: zod_1.z.string().min(8),
    deviceId: zod_1.z.string().min(8)
});
async function registerUser(input) {
    const parsed = exports.RegisterSchema.parse(input);
    const pepper = process.env.PASSWORD_PEPPER || '';
    const passwordSha512 = (0, crypto_1.sha512WithPepper)(parsed.password, pepper);
    const existing = await usersCol().where('email', '==', parsed.email).limit(1).get();
    if (!existing.empty) {
        throw new Error('Email already registered');
    }
    const userRef = usersCol().doc();
    const accountRef = accountsCol().doc();
    const deviceRef = devicesCol().doc();
    await firebase_1.firestore.runTransaction(async (tx) => {
        tx.set(userRef, {
            id: userRef.id,
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
            passwordSha512,
            isActive: true,
            createdAt: new Date()
        });
        tx.set(accountRef, {
            id: accountRef.id,
            userId: userRef.id,
            balance: 0,
            createdAt: new Date()
        });
        tx.set(deviceRef, {
            id: deviceRef.id,
            userId: userRef.id,
            deviceId: parsed.deviceId,
            verifiedAt: null,
            createdAt: new Date()
        });
    });
    return { message: 'Registration successful. Device pending verification.' };
}
async function loginUser(input) {
    const parsed = exports.LoginSchema.parse(input);
    const pepper = process.env.PASSWORD_PEPPER || '';
    const passwordSha512 = (0, crypto_1.sha512WithPepper)(parsed.password, pepper);
    const userSnap = await usersCol().where('email', '==', parsed.email).limit(1).get();
    if (userSnap.empty)
        throw new Error('Invalid credentials');
    const user = userSnap.docs[0].data();
    if (user.passwordSha512 !== passwordSha512)
        throw new Error('Invalid credentials');
    const deviceSnap = await devicesCol()
        .where('userId', '==', user.id)
        .where('deviceId', '==', parsed.deviceId)
        .limit(1)
        .get();
    if (deviceSnap.empty)
        throw new Error('Device not registered');
    const device = deviceSnap.docs[0].data();
    if (!device.verifiedAt)
        throw new Error('Device not verified');
    return { userId: user.id };
}
