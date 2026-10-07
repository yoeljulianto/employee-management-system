import { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Format JSON tidak valid" });
    return;
  }

  if (err?.code === "P2002") {
    res.status(409).json({ success: false, message: "Data dengan nilai tersebut sudah ada" });
    return;
  }

  if (err?.code === "P2025") {
    res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
};