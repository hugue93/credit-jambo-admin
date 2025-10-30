"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signJwt = signJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function signJwt(claims, expiresIn = '15m') {
    return jsonwebtoken_1.default.sign(claims, process.env.JWT_SECRET, { expiresIn });
}
