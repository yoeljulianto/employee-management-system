import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/context";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-base font-bold text-slate-800 sm:text-lg">Employee Management</h1>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role === "ADMIN" ? "Admin" : "Viewer"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}