import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/lib/prisma";
import { ADMIN, VIEWER, bearer, cleanup, ensureUsers, login, validEmployee } from "./helpers";

let admin = "";
let viewer = "";
let deptId = 0;

function createEmployee(overrides: Record<string, unknown> = {}, departmentId = deptId) {
  return request(app).post("/employees").set(bearer(admin)).send(validEmployee(departmentId, overrides));
}

async function createDepartment(name: string) {
  const dept = await prisma.department.create({ data: { name } });
  return dept.id;
}

beforeAll(async () => {
  await ensureUsers();
  await cleanup();
  admin = await login(ADMIN);
  viewer = await login(VIEWER);
  deptId = await createDepartment("Test Dept Employees");
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("POST /employees", () => {
  it("admin menambah karyawan dan mendapat data department", async () => {
    const res = await createEmployee();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.department.name).toBe("Test Dept Employees");
  });

  it("email dan nomor HP tidak valid mengembalikan 400 dengan detail field", async () => {
    const res = await createEmployee({ email: "bukan-email", phone: "123" });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(["email", "phone"]));
  });

  it("body kosong mengembalikan 400", async () => {
    const res = await request(app).post("/employees").set(bearer(admin)).send({});
    expect(res.status).toBe(400);
  });

  it("email duplikat mengembalikan 409", async () => {
    const first = await createEmployee({ email: "test-duplikat@example.com" });
    expect(first.status).toBe(201);
    const second = await createEmployee({ email: "test-duplikat@example.com" });
    expect(second.status).toBe(409);
  });

  it("department yang tidak ada mengembalikan 400", async () => {
    const res = await createEmployee({}, 999999);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Department tidak ditemukan");
  });

  it("viewer tidak boleh menambah", async () => {
    const res = await request(app).post("/employees").set(bearer(viewer)).send(validEmployee(deptId));
    expect(res.status).toBe(403);
  });

  it("tanpa token mengembalikan 401", async () => {
    const res = await request(app).post("/employees").send(validEmployee(deptId));
    expect(res.status).toBe(401);
  });
});

describe("GET /employees (search, filter, sorting, pagination)", () => {
  it("pagination menghasilkan meta yang benar", async () => {
    const pagingDept = await createDepartment("Test Dept Paging");
    for (let i = 0; i < 3; i++) {
      await createEmployee({}, pagingDept);
    }

    const page1 = await request(app).get(`/employees?departmentId=${pagingDept}&limit=2&page=1`).set(bearer(admin));
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const page2 = await request(app).get(`/employees?departmentId=${pagingDept}&limit=2&page=2`).set(bearer(admin));
    expect(page2.body.data).toHaveLength(1);
  });

  it("search mencari berdasarkan nama tanpa peduli huruf besar-kecil", async () => {
    await createEmployee({ name: "Test Zebra Unik" });
    const res = await request(app).get("/employees?search=ZEBRA").set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Test Zebra Unik");
  });

  it("filter status hanya mengembalikan status yang diminta", async () => {
    await createEmployee({ status: "INACTIVE" });
    const res = await request(app).get(`/employees?departmentId=${deptId}&status=INACTIVE`).set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((e: { status: string }) => e.status === "INACTIVE")).toBe(true);
  });

  it("sorting berdasarkan nama menaik dan menurun", async () => {
    const sortDept = await createDepartment("Test Dept Sort");
    await createEmployee({ name: "Test Bravo" }, sortDept);
    await createEmployee({ name: "Test Alpha" }, sortDept);

    const asc = await request(app).get(`/employees?departmentId=${sortDept}&sortBy=name&order=asc`).set(bearer(admin));
    expect(asc.body.data.map((e: { name: string }) => e.name)).toEqual(["Test Alpha", "Test Bravo"]);

    const desc = await request(app).get(`/employees?departmentId=${sortDept}&sortBy=name&order=desc`).set(bearer(admin));
    expect(desc.body.data.map((e: { name: string }) => e.name)).toEqual(["Test Bravo", "Test Alpha"]);
  });

  it("kolom sorting yang tidak diizinkan mengembalikan 400", async () => {
    const res = await request(app).get("/employees?sortBy=password").set(bearer(admin));
    expect(res.status).toBe(400);
  });

  it("viewer boleh membaca daftar", async () => {
    const res = await request(app).get("/employees").set(bearer(viewer));
    expect(res.status).toBe(200);
  });
});

describe("GET, PUT, DELETE /employees/:id", () => {
  it("detail, ID tidak ada, dan ID tidak valid", async () => {
    const created = await createEmployee();
    const id = created.body.data.id;

    const found = await request(app).get(`/employees/${id}`).set(bearer(admin));
    expect(found.status).toBe(200);
    expect(found.body.data.id).toBe(id);

    const missing = await request(app).get("/employees/999999").set(bearer(admin));
    expect(missing.status).toBe(404);

    const invalid = await request(app).get("/employees/abc").set(bearer(admin));
    expect(invalid.status).toBe(400);
  });

  it("admin mengubah data karyawan", async () => {
    const created = (await createEmployee()).body.data;
    const res = await request(app)
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
    expect(res.status).toBe(200);
    expect(res.body.data.position).toBe("Senior Tester");
  });

  it("mengubah karyawan yang tidak ada mengembalikan 404", async () => {
    const res = await request(app).put("/employees/999999").set(bearer(admin)).send(validEmployee(deptId));
    expect(res.status).toBe(404);
  });

  it("viewer tidak boleh menghapus dan data tetap ada", async () => {
    const created = (await createEmployee()).body.data;
    const res = await request(app).delete(`/employees/${created.id}`).set(bearer(viewer));
    expect(res.status).toBe(403);

    const still = await request(app).get(`/employees/${created.id}`).set(bearer(admin));
    expect(still.status).toBe(200);
  });

  it("admin menghapus karyawan, lalu datanya tidak ditemukan", async () => {
    const created = (await createEmployee()).body.data;
    const deleted = await request(app).delete(`/employees/${created.id}`).set(bearer(admin));
    expect(deleted.status).toBe(200);

    const after = await request(app).get(`/employees/${created.id}`).set(bearer(admin));
    expect(after.status).toBe(404);
  });
});

describe("GET /employees/export", () => {
  it("tanpa token mengembalikan 401", async () => {
    const res = await request(app).get("/employees/export");
    expect(res.status).toBe(401);
  });

  it("viewer boleh export dan mendapat file CSV", async () => {
    await createEmployee({ name: "Test Export Satu" });
    const res = await request(app).get("/employees/export?search=export").set(bearer(viewer));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("employees.csv");
    expect(res.text).toContain("ID,Nama,Email,No. HP,Jabatan,Departemen,Status,Tanggal Masuk");
    expect(res.text).toContain("Test Export Satu");
  });

  it("filter berlaku pada export", async () => {
    const res = await request(app).get("/employees/export?search=zzzz-tidak-ada").set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("Test");
  });

  it("nilai berawalan rumus dan berisi koma dibuat aman", async () => {
    await createEmployee({ name: "=Test Formula, Inc" });
    const res = await request(app).get("/employees/export?search=formula").set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.text).toContain(`"'=Test Formula, Inc"`);
  });

  it("kolom sorting yang tidak valid mengembalikan 400", async () => {
    const res = await request(app).get("/employees/export?sortBy=password").set(bearer(admin));
    expect(res.status).toBe(400);
  });
});