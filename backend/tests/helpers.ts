import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";

export const ADMIN = { name: "Admin", email: "admin@example.com", password: "Admin123!", role: "ADMIN" as const };
export const VIEWER = { name: "Viewer", email: "viewer@example.com", password: "Viewer123!", role: "VIEWER" as const };

export async function ensureUsers() {
  for (const u of [ADMIN, VIEWER]) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role },
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
  }
}

export async function login(user: { email: string; password: string }) {
  const res = await request(app).post("/auth/login").send({ email: user.email, password: user.password });
  return res.body.data.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function cleanup() {
  await prisma.employee.deleteMany({ where: { email: { startsWith: "test-" } } });
  await prisma.department.deleteMany({ where: { name: { startsWith: "Test " } } });
}

export function validEmployee(departmentId: number, overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Employee",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    phone: "081234567890",
    position: "Tester",
    hireDate: "2024-01-01",
    departmentId,
    ...overrides,
  };
}