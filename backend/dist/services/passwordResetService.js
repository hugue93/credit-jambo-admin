"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetSchema = exports.ForgotSchema = void 0;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
const firebase_1 = require("../utils/firebase");
const zod_1 = require("zod");
const crypto_1 = require("../utils/crypto");
const usersCol = () => firebase_1.firestore.collection('users');
const resetsCol = () => firebase_1.firestore.collection('password_resets');
exports.ForgotSchema = zod_1.z.object({
    email: zod_1.z.string().email().trim().toLowerCase(),
});
exports.ResetSchema = zod_1.z.object({
    email: zod_1.z.string().email().trim().toLowerCase(),
    token: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(8)
        .regex(/[A-Z]/, 'Must include an uppercase letter')
        .regex(/[a-z]/, 'Must include a lowercase letter')
        .regex(/[0-9]/, 'Must include a digit')
        .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
});
function generateToken() {
    // Simple 6-digit code for demo; replace with secure UUID for production
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
}
async function requestPasswordReset(input) {
    const { email } = exports.ForgotSchema.parse(input);
    const userSnap = await usersCol().where('email', '==', email).limit(1).get();
    if (userSnap.empty)
        return { message: 'If account exists, an email has been sent.' };
    const user = userSnap.docs[0].data();
    const token = generateToken();
    const resetRef = resetsCol().doc();
    await resetRef.set({ id: resetRef.id, userId: user.id, email, token, usedAt: null, createdAt: new Date(), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    // In production, send token via email. For dev, return it in response.
    return { message: 'Reset code generated', token };
}
async function resetPassword(input) {
    const { email, token, newPassword } = exports.ResetSchema.parse(input);
    const resetSnap = await resetsCol()
        .where('email', '==', email)
        .where('token', '==', token)
        .where('usedAt', '==', null)
        .limit(1)
        .get();
    if (resetSnap.empty)
        throw new Error('Invalid or expired token');
    const resetDoc = resetSnap.docs[0];
    const reset = resetDoc.data();
    if (reset.expiresAt?.toDate && reset.expiresAt.toDate() < new Date())
        throw new Error('Token expired');
    const userSnap = await usersCol().where('email', '==', email).limit(1).get();
    if (userSnap.empty)
        throw new Error('Account not found');
    const userDoc = userSnap.docs[0];
    const pepper = process.env.PASSWORD_PEPPER || '';
    const passwordSha512 = (0, crypto_1.sha512WithPepper)(newPassword, pepper);
    await firebase_1.firestore.runTransaction(async (tx) => {
        tx.update(userDoc.ref, { passwordSha512 });
        tx.update(resetDoc.ref, { usedAt: new Date() });
    });
    return { message: 'Password reset successful' };
}
