import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { AppError } from "../utils/AppError";
import { parseId } from "../utils/parseId";
import { logAudit, toJson } from "../utils/audit";

const router = Router();

const departmentSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
});

router.use(authenticate);

router.get("/", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  res.json({ success: true, data: departments });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const data = departmentSchema.parse(req.body);

  const department = await prisma.$transaction(async (tx) => {
    const created = await tx.department.create({ data });
    await logAudit(tx, {
      userId: req.user!.id,
      action: "CREATE",
      entity: "department",
      entityId: created.id,
      changes: toJson(created),
    });
    return created;
  });

  res.status(201).json({ success: true, data: department });
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);
  const data = departmentSchema.parse(req.body);

  const department = await prisma.$transaction(async (tx) => {
    const before = await tx.department.findUnique({ where: { id } });
    if (!before) {
      throw new AppError(404, "Department tidak ditemukan");
    }
    const updated = await tx.department.update({ where: { id }, data });
    await logAudit(tx, {
      userId: req.user!.id,
      action: "UPDATE",
      entity: "department",
      entityId: id,
      changes: toJson({ before, after: updated }),
    });
    return updated;
  });

  res.json({ success: true, data: department });
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = parseId(req.params.id);

  await prisma.$transaction(async (tx) => {
    const before = await tx.department.findUnique({ where: { id } });
    if (!before) {
      throw new AppError(404, "Department tidak ditemukan");
    }
    const employeeCount = await tx.employee.count({ where: { departmentId: id } });
    if (employeeCount > 0) {
      throw new AppError(409, "Department masih memiliki karyawan, tidak bisa dihapus");
    }
    await tx.department.delete({ where: { id } });
    await logAudit(tx, {
      userId: req.user!.id,
      action: "DELETE",
      entity: "department",
      entityId: id,
      changes: toJson(before),
    });
  });

  res.json({ success: true, message: "Department berhasil dihapus" });
});

export default router;