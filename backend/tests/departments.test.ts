import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { ADMIN, VIEWER, bearer, cleanup, ensureUsers, login, validEmployee } from "./helpers";

let admin = "";
let viewer = "";

beforeAll(async () => {
  await ensureUsers();
  await cleanup();
  admin = await login(ADMIN);
  viewer = await login(VIEWER);
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Departments: hak akses", () => {
  it("tanpa token mengembalikan 401", async () => {
    const res = await request(app).get("/departments");
    expect(res.status).toBe(401);
  });

  it("viewer boleh melihat daftar", async () => {
    const res = await request(app).get("/departments").set(bearer(viewer));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("viewer tidak boleh menambah", async () => {
    const res = await request(app).post("/departments").set(bearer(viewer)).send({ name: "Test Dept Viewer" });
    expect(res.status).toBe(403);
  });
});

describe("Departments: CRUD", () => {
  it("admin menambah, mengubah, lalu menghapus", async () => {
    const created = await request(app).post("/departments").set(bearer(admin)).send({ name: "Test Dept Crud" });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const updated = await request(app).put(`/departments/${id}`).set(bearer(admin)).send({ name: "Test Dept Crud Baru" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Test Dept Crud Baru");

    const deleted = await request(app).delete(`/departments/${id}`).set(bearer(admin));
    expect(deleted.status).toBe(200);

    const again = await request(app).delete(`/departments/${id}`).set(bearer(admin));
    expect(again.status).toBe(404);
  });

  it("nama terlalu pendek mengembalikan 400 dengan detail field", async () => {
    const res = await request(app).post("/departments").set(bearer(admin)).send({ name: "A" });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("name");
  });

  it("nama duplikat mengembalikan 409", async () => {
    await request(app).post("/departments").set(bearer(admin)).send({ name: "Test Dept Dup" });
    const res = await request(app).post("/departments").set(bearer(admin)).send({ name: "Test Dept Dup" });
    expect(res.status).toBe(409);
  });

  it("ID tidak valid mengembalikan 400", async () => {
    const res = await request(app).put("/departments/abc").set(bearer(admin)).send({ name: "Test Dept X" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("ID tidak valid");
  });

  it("department yang masih punya karyawan tidak bisa dihapus", async () => {
    const dept = await request(app).post("/departments").set(bearer(admin)).send({ name: "Test Dept Berisi" });
    const deptId = dept.body.data.id;

    const emp = await request(app).post("/employees").set(bearer(admin)).send(validEmployee(deptId));
    expect(emp.status).toBe(201);

    const res = await request(app).delete(`/departments/${deptId}`).set(bearer(admin));
    expect(res.status).toBe(409);
  });
});