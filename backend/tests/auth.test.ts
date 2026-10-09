import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { ADMIN, bearer, ensureUsers } from "./helpers";

beforeAll(async () => {
  await ensureUsers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /auth/login", () => {
  it("login berhasil mengembalikan token dan data user tanpa password", async () => {
    const res = await request(app).post("/auth/login").send({ email: ADMIN.email, password: ADMIN.password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.role).toBe("ADMIN");
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("password salah mengembalikan 401", async () => {
    const res = await request(app).post("/auth/login").send({ email: ADMIN.email, password: "salah" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Email atau password salah");
  });

  it("email tidak terdaftar mengembalikan pesan yang sama dengan password salah", async () => {
    const res = await request(app).post("/auth/login").send({ email: "tidak-ada@example.com", password: "apa-saja" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Email atau password salah");
  });

  it("field kosong mengembalikan 400", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("JSON rusak mengembalikan 400", async () => {
    const res = await request(app).post("/auth/login").set("Content-Type", "application/json").send("{name:}");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Format JSON tidak valid");
  });
});

describe("GET /auth/me", () => {
  it("tanpa token mengembalikan 401", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token tidak ditemukan");
  });

  it("token palsu mengembalikan 401", async () => {
    const res = await request(app).get("/auth/me").set(bearer("token-palsu"));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Token tidak valid atau kedaluwarsa");
  });

  it("token valid mengembalikan role pengguna", async () => {
    const login = await request(app).post("/auth/login").send({ email: ADMIN.email, password: ADMIN.password });
    const res = await request(app).get("/auth/me").set(bearer(login.body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("ADMIN");
  });
});