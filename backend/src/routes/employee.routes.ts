import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import { authenticate, requireRole } from "../middleware/auth";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/parseId";
import { logAudit, toJson } from "../utils/audit";
import { toCsv } from "../utils/csv";

const router = Router();

const employeeSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[1-9][0-9]{7,11}$/, "Format nomor HP tidak valid (contoh: 081234567890)"),
  position: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(100, "Jabatan maksimal 100 karakter"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  hireDate: z.coerce.date(),
  departmentId: z.number().int().positive("departmentId wajib diisi"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sortBy: z.enum(["name", "email", "position", "hireDate", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const exportQuerySchema = listQuerySchema.omit({ page: true, limit: true });

function buildWhere(filters: {
  search?: string;
  departmentId?: number;
  status?: "ACTIVE" | "INACTIVE";
}): Prisma.EmployeeWhereInput {
  const { search, departmentId, status } = filters;
  return {
    ...(departmentId && { departmentId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
}

async function ensureDepartmentExists(id: number) {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    throw new AppError(400, "Department tidak ditemukan");
  }
}

router.use(authenticate);

router.get("/", async (req, res) => {
  const { page, limit, search, departmentId, status, sortBy, order } = listQuerySchema.parse(req.query);

  const where = buildWhere({ search, departmentId, status });

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: { department: { select: { id: true, name: true } } },
    }),
    prisma.employee.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get("/export", async (req, res) => {
  const { search, departmentId, status, sortBy, order } = exportQuerySchema.parse(req.query);

  const employees = await prisma.employee.findMany({
    where: buildWhere({ search, departmentId, status }),
    orderBy: { [sortBy]: order },
    include: { department: { select: { name: true } } },
  });

  const csv = toCsv(
    ["ID", "Nama", "Email", "No. HP", "Jabatan", "Departemen", "Status", "Tanggal Masuk"],
    employees.map((e) => [
      e.id,
      e.name,
      e.email,
      e.phone,
      e.position,
      e.department.name,
      e.status,
      e.hireDate.toISOString().slice(0, 10),
    ]),
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
  res.send("\uFEFF" + csv);
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!employee) {
    throw new AppError(404, "Karyawan tidak ditemukan");
  }
  res.json({ success: true, data: employee });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const data = employeeSchema.parse(req.body);
  await ensureDepartmentExists(data.departmentId);

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data,
      include: { department: { select: { id: true, name: true } } },
    });
    await logAudit(tx, {
      userId: req.user!.id,
      action: "CREATE",
      entity: "employee",
      entityId: created.id,
      changes: toJson(created),
    });
    return created;
  });

  res.status(201).json({ success: true, data: employee });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  const data = employeeSchema.parse(req.body);
  await ensureDepartmentExists(data.departmentId);

  const employee = await prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({ where: { id } });
    if (!before) {
      throw new AppError(404, "Karyawan tidak ditemukan");
    }
    const updated = await tx.employee.update({
      where: { id },
      data,
      include: { department: { select: { id: true, name: true } } },
    });
    await logAudit(tx, {
      userId: req.user!.id,
      action: "UPDATE",
      entity: "employee",
      entityId: id,
      changes: toJson({ before, after: updated }),
    });
    return updated;
  });

  res.json({ success: true, data: employee });
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);

  await prisma.$transaction(async (tx) => {
    const before = await tx.employee.findUnique({ where: { id } });
    if (!before) {
      throw new AppError(404, "Karyawan tidak ditemukan");
    }
    await tx.employee.delete({ where: { id } });
    await logAudit(tx, {
      userId: req.user!.id,
      action: "DELETE",
      entity: "employee",
      entityId: id,
      changes: toJson(before),
    });
  });

  res.json({ success: true, message: "Karyawan berhasil dihapus" });
});

export default router;