import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    res.status(400).json({ success: false, message: "Email dan password wajib diisi" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordValid) {
    res.status(401).json({ success: false, message: "Email atau password salah" });
    return;
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: "1d",
  });

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

export default router;