"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha512WithPepper = sha512WithPepper;
const crypto_1 = __importDefault(require("crypto"));
function sha512WithPepper(input, pepper) {
    return crypto_1.default.createHash('sha512').update(input + pepper, 'utf8').digest('hex');
}
