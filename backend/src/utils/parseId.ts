import { AppError } from "./AppError";

export function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "ID tidak valid");
  }
  return id;
}