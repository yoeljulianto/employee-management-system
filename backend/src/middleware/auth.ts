import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type Role = "ADMIN" | "VIEWER";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token tidak ditemukan" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: Role };
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token tidak valid atau kedaluwarsa" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "Anda tidak punya akses" });
      return;
    }
    next();
  };
}