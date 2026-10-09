import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context";

export default function AdminRoute() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? <Outlet /> : <Navigate to="/" replace />;
}