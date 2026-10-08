import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import departmentRoutes from "./routes/department.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import employeeRoutes from "./routes/employee.routes";
import auditRoutes from "./routes/audit.routes";
import { apiLimiter } from "./middleware/rateLimiter";

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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