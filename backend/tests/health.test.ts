import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("System", () => {
  it("GET /health mengembalikan 200 dan database terhubung", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
  });

  it("route yang tidak dikenal mengembalikan 404 dengan format konsisten", async () => {
    const res = await request(app).get("/tidak-ada");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Endpoint tidak ditemukan" });
  });

  it("halaman /api-documentation tersedia", async () => {
    const res = await request(app).get("/api-documentation/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});