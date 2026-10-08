import { Prisma } from "../generated/prisma/client";

type AuditParams = {
  userId: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: number;
  changes?: Prisma.InputJsonValue;
};

export function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function logAudit(db: Prisma.TransactionClient, params: AuditParams) {
  await db.auditLog.create({ data: params });
}