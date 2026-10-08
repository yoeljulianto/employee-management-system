import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import departmentRoutes from "./routes/department.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import employeeRoutes from "./routes/employee.routes";
import auditRoutes from "./routes/audit.routes";
import { apiLimiter } from "./middleware/rateLimiter";
import { prisma } from "./lib/prisma";

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(apiLimiter);

app.use("/auth", authRoutes);
app.use("/departments", departmentRoutes);
app.use("/employees", employeeRoutes);
app.use("/audit-logs", auditRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});