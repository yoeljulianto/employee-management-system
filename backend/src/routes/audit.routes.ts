import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entity: z.string().trim().optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE"]).optional(),
  userId: z.coerce.number().int().positive().optional(),
});

router.use(authenticate, requireRole("ADMIN"));

router.get("/", async (req, res) => {
  const { page, limit, entity, action, userId } = querySchema.parse(req.query);

  const where: Prisma.AuditLogWhereInput = {
    ...(entity && { entity }),
    ...(action && { action }),
    ...(userId && { userId }),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;