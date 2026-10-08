import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import { authenticate, requireRole } from "../middleware/auth";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/parseId";

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

async function ensureDepartmentExists(id: number) {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    throw new AppError(400, "Department tidak ditemukan");
  }
}

router.use(authenticate);

router.get("/", async (req, res) => {
  const { page, limit, search, departmentId, status, sortBy, order } = listQuerySchema.parse(req.query);

  const where: Prisma.EmployeeWhereInput = {
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
  const employee = await prisma.employee.create({
    data,
    include: { department: { select: { id: true, name: true } } },
  });
  res.status(201).json({ success: true, data: employee });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  const data = employeeSchema.parse(req.body);
  await ensureDepartmentExists(data.departmentId);
  const employee = await prisma.employee.update({
    where: { id },
    data,
    include: { department: { select: { id: true, name: true } } },
  });
  res.json({ success: true, data: employee });
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  await prisma.employee.delete({ where: { id } });
  res.json({ success: true, message: "Karyawan berhasil dihapus" });
});

export default router;