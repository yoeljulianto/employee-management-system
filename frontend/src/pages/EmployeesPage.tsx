import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/context";
import StatusBadge from "../components/StatusBadge";
import { api, ApiError, downloadFile } from "../lib/api";
import { formatDate } from "../lib/format";
import { useDebounce } from "../lib/useDebounce";
import type { Department, Employee, PageMeta } from "../types";

const LIMIT = 10;

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Terbaru ditambahkan" },
  { value: "createdAt:asc", label: "Terlama ditambahkan" },
  { value: "name:asc", label: "Nama A-Z" },
  { value: "name:desc", label: "Nama Z-A" },
  { value: "hireDate:desc", label: "Tanggal masuk terbaru" },
  { value: "hireDate:asc", label: "Tanggal masuk terlama" },
];

type Result = { key: string; employees?: Employee[]; meta?: PageMeta; error?: string };

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export default function EmployeesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const search = useDebounce(searchInput.trim());

  const queryString = useMemo(() => {
    const [sortBy, order] = sort.split(":");
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      sortBy,
      order,
    });
    if (search) params.set("search", search);
    if (departmentId) params.set("departmentId", departmentId);
    if (status) params.set("status", status);
    return params.toString();
  }, [page, search, departmentId, status, sort]);

  const requestKey = `${queryString}#${reload}`;

  useEffect(() => {
    api<{ data: Department[] }>("/departments")
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    api<{ data: Employee[]; meta: PageMeta }>(`/employees?${queryString}`)
      .then((res) => {
        if (!cancelled) setResult({ key: requestKey, employees: res.data, meta: res.meta });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({ key: requestKey, error: err instanceof ApiError ? err.message : "Terjadi kesalahan" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [queryString, requestKey]);

  const loading = !result || result.key !== requestKey;
  const employees = !loading ? result?.employees : undefined;
  const meta = !loading ? result?.meta : undefined;
  const error = !loading ? result?.error : undefined;
  const filterActive = Boolean(searchInput || departmentId || status);

  function resetFilters() {
    setSearchInput("");
    setDepartmentId("");
    setStatus("");
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const params = new URLSearchParams(queryString);
      params.delete("page");
      params.delete("limit");
      await downloadFile(`/employees/export?${params.toString()}`, "employees.csv");
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : "Gagal mengunduh file");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Data Karyawan</h2>
          {meta && <p className="text-sm text-slate-500">{meta.total} karyawan ditemukan</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting ? "Mengunduh..." : "Export CSV"}
          </button>
          {isAdmin && (
            <Link
              to="/employees/new"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Tambah Karyawan
            </Link>
          )}
        </div>
      </div>

      {exportError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {exportError}
        </p>
      )}

      <div className="grid gap-3 rounded-xl bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Cari nama, email, atau jabatan"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        />
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Semua department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {filterActive && (
          <button
            onClick={resetFilters}
            className="text-left text-sm font-medium text-blue-600 hover:underline sm:col-span-2 lg:col-span-4"
          >
            Reset filter
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Memuat data">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            onClick={() => setReload((n) => n + 1)}
            className="mt-2 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {employees && employees.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <p className="font-medium text-slate-700">
            {filterActive ? "Tidak ada karyawan yang cocok dengan filter" : "Belum ada data karyawan"}
          </p>
          {filterActive && (
            <button onClick={resetFilters} className="mt-2 text-sm font-semibold text-blue-600 hover:underline">
              Reset filter
            </button>
          )}
        </div>
      )}

      {employees && employees.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Jabatan</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Tanggal masuk</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <Link to={`/employees/${e.id}`} className="font-medium text-blue-700 hover:underline">
                      {e.name}
                    </Link>
                      <p className="text-xs text-slate-500">{e.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.position}</td>
                    <td className="px-4 py-3 text-slate-700">{e.department.name}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(e.hireDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {employees.map((e) => (
              <li key={e.id} className="rounded-xl bg-white p-4 shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/employees/${e.id}`} className="font-medium text-blue-700 hover:underline">
                      {e.name}
                    </Link>
                    <p className="text-xs text-slate-500">{e.email}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  {e.position} · {e.department.name}
                </p>
                <p className="text-xs text-slate-500">Masuk {formatDate(e.hireDate)}</p>
              </li>
            ))}
          </ul>

          {meta && (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={meta.page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-slate-600">
                Halaman {meta.page} dari {Math.max(meta.totalPages, 1)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={meta.page >= meta.totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}