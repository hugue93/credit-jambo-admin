"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRegisterByEmailSchema = exports.DeviceRegisterSchema = void 0;
exports.registerDevice = registerDevice;
exports.registerDeviceByEmail = registerDeviceByEmail;
const firebase_1 = require("../utils/firebase");
const zod_1 = require("zod");
const devicesCol = () => firebase_1.firestore.collection('devices');
const usersCol = () => firebase_1.firestore.collection('users');
exports.DeviceRegisterSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    deviceId: zod_1.z.string().min(8),
});
exports.DeviceRegisterByEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email().trim().toLowerCase(),
    deviceId: zod_1.z.string().min(8),
});
async function registerDevice(input) {
    const { userId, deviceId } = exports.DeviceRegisterSchema.parse(input);
    const userRef = usersCol().doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists)
        throw new Error('User not found');
    const existing = await devicesCol().where('userId', '==', userId).where('deviceId', '==', deviceId).limit(1).get();
    if (!existing.empty)
        return { message: 'Device already registered' };
    const deviceRef = devicesCol().doc();
    await deviceRef.set({
        id: deviceRef.id,
        userId,
        deviceId,
        verifiedAt: null,
        createdAt: new Date(),
    });
    return { message: 'Device registered. Await admin verification.' };
}
async function registerDeviceByEmail(input) {
    const { email, deviceId } = exports.DeviceRegisterByEmailSchema.parse(input);
    const userSnap = await usersCol().where('email', '==', email).limit(1).get();
    if (userSnap.empty)
        throw new Error('User not found');
    const user = userSnap.docs[0].data();
    return registerDevice({ userId: user.id, deviceId });
}
