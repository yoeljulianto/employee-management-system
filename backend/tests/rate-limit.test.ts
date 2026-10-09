import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { ADMIN, ensureUsers } from "./helpers";

beforeAll(async () => {
  await ensureUsers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Rate limiting login", () => {
  it("memblokir login setelah 10 percobaan gagal", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await request(app).post("/auth/login").send({ email: ADMIN.email, password: "salah" });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});