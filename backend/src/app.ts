import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import departmentRoutes from "./routes/department.routes";
import employeeRoutes from "./routes/employee.routes";
import auditRoutes from "./routes/audit.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { openApiSpec } from "./docs/openapi";
import { prisma } from "./lib/prisma";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
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

app.use(
  "/api-documentation",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: "Employee Management API",
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use(apiLimiter);

app.use("/auth", authRoutes);
app.use("/departments", departmentRoutes);
app.use("/employees", employeeRoutes);
app.use("/audit-logs", auditRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;