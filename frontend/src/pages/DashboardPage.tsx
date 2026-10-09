import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/context";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-4">
      <h1 className="text-2xl font-bold text-slate-800">Halo, {user?.name}</h1>
      <p className="text-slate-600">Role: {user?.role}</p>
      <button
        onClick={handleLogout}
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
      >
        Keluar
      </button>
    </div>
  );
}