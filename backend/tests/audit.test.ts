import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { ADMIN, VIEWER, bearer, cleanup, ensureUsers, login, validEmployee } from "./helpers";

let admin = "";
let viewer = "";
let deptId = 0;

async function totalLogs() {
  const res = await request(app).get("/audit-logs?limit=1").set(bearer(admin));
  return res.body.meta.total as number;
}

beforeAll(async () => {
  await ensureUsers();
  await cleanup();
  admin = await login(ADMIN);
  viewer = await login(VIEWER);
  const dept = await prisma.department.create({ data: { name: "Test Dept Audit" } });
  deptId = dept.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Audit log: hak akses", () => {
  it("viewer tidak boleh melihat log", async () => {
    const res = await request(app).get("/audit-logs").set(bearer(viewer));
    expect(res.status).toBe(403);
  });

  it("tanpa token mengembalikan 401", async () => {
    const res = await request(app).get("/audit-logs");
    expect(res.status).toBe(401);
  });

  it("nilai action yang tidak dikenal mengembalikan 400", async () => {
    const res = await request(app).get("/audit-logs?action=HACK").set(bearer(admin));
    expect(res.status).toBe(400);
  });
});

describe("Audit log: pencatatan", () => {
  it("create, update, dan delete masing-masing tercatat", async () => {
    const before = await totalLogs();

    const created = (await request(app).post("/employees").set(bearer(admin)).send(validEmployee(deptId))).body.data;

    await request(app)
      .put(`/employees/${created.id}`)
      .set(bearer(admin))
      .send({
        name: created.name,
        email: created.email,
        phone: created.phone,
        position: "Senior Tester",
        status: "ACTIVE",
        hireDate: "2024-01-01",
        departmentId: deptId,
      });

    await request(app).delete(`/employees/${created.id}`).set(bearer(admin));

    expect(await totalLogs()).toBe(before + 3);

    const logs = await request(app).get("/audit-logs?limit=3").set(bearer(admin));
    const data = logs.body.data;

    expect(data.map((l: { action: string }) => l.action)).toEqual(["DELETE", "UPDATE", "CREATE"]);
    expect(data.every((l: { entityId: number; entity: string }) => l.entityId === created.id && l.entity === "employee")).toBe(true);
    expect(data[0].user.email).toBe(ADMIN.email);
    expect(data[1].changes.before.position).toBe("Tester");
    expect(data[1].changes.after.position).toBe("Senior Tester");
  });

  it("request yang gagal tidak meninggalkan log", async () => {
    const dup = await request(app).post("/employees").set(bearer(admin)).send(validEmployee(deptId, { email: "test-audit-dup@example.com" }));
    expect(dup.status).toBe(201);

    const before = await totalLogs();

    const duplicate = await request(app).post("/employees").set(bearer(admin)).send(validEmployee(deptId, { email: "test-audit-dup@example.com" }));
    expect(duplicate.status).toBe(409);

    const invalid = await request(app).post("/employees").set(bearer(admin)).send({});
    expect(invalid.status).toBe(400);

    const missingPut = await request(app).put("/employees/999999").set(bearer(admin)).send(validEmployee(deptId));
    expect(missingPut.status).toBe(404);

    const missingDelete = await request(app).delete("/employees/999999").set(bearer(admin));
    expect(missingDelete.status).toBe(404);

    const forbidden = await request(app).delete(`/employees/1`).set(bearer(viewer));
    expect(forbidden.status).toBe(403);

    expect(await totalLogs()).toBe(before);
  });
});