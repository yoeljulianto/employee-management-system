import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

const WINDOW_MS = 15 * 60 * 1000;

function tooManyRequests(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ success: false, message });
  };
}

export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests("Terlalu banyak request, coba lagi nanti"),
});

export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests("Terlalu banyak percobaan login, coba lagi dalam 15 menit"),
});