import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/context";
import StatusBadge from "../components/StatusBadge";
import { api, ApiError } from "../lib/api";
import { formatDate } from "../lib/format";
import { useEmployee } from "../lib/useEmployee";

export default function EmployeeDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const parsed = Number(params.id);
  const id = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const { loading, employee, error } = useEmployee(id);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (id === null) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api(`/employees/${id}`, { method: "DELETE" });
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
      setDeleting(false);
    }
  }

  const backLink = (
    <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">
      &larr; Kembali ke daftar
    </Link>
  );

  if (id === null) {
    return (
      <div className="space-y-3">
        {backLink}
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Karyawan tidak ditemukan
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Memuat data">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-3">
        {backLink}
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Karyawan tidak ditemukan"}
        </p>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Email", employee.email],
    ["No. HP", employee.phone],
    ["Jabatan", employee.position],
    ["Department", employee.department.name],
    ["Tanggal masuk", formatDate(employee.hireDate)],
  ];

  return (
    <div className="space-y-4">
      {backLink}

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
            <div className="mt-1">
              <StatusBadge status={employee.status} />
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <Link
                to={`/employees/${employee.id}/edit`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ubah
              </Link>
              <button
                onClick={() => setConfirming(true)}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase text-slate-500">{label}</dt>
              <dd className="mt-0.5 break-words text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-slate-800">Hapus karyawan?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Data <span className="font-semibold">{employee.name}</span> akan dihapus permanen.
            </p>

            {deleteError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}