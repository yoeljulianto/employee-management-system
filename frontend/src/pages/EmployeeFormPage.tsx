import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useEmployee } from "../lib/useEmployee";
import type { Department, Employee, EmployeeStatus } from "../types";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  departmentId: string;
};

const emptyValues: FormValues = {
  name: "",
  email: "",
  phone: "",
  position: "",
  status: "ACTIVE",
  hireDate: "",
  departmentId: "",
};

function toValues(e: Employee): FormValues {
  return {
    name: e.name,
    email: e.email,
    phone: e.phone,
    position: e.position,
    status: e.status,
    hireDate: e.hireDate.slice(0, 10),
    departmentId: String(e.departmentId),
  };
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function EmployeeForm({ employee }: { employee?: Employee }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(employee ? toValues(employee) : emptyValues);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ data: Department[] }>("/departments")
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, []);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setFieldErrors((errs) => {
      if (!errs[key]) return errs;
      const next = { ...errs };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSaving(true);

    const body = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      position: values.position.trim(),
      status: values.status,
      hireDate: values.hireDate,
      departmentId: Number(values.departmentId),
    };

    try {
      if (employee) {
        await api(`/employees/${employee.id}`, { method: "PUT", body });
        navigate(`/employees/${employee.id}`, { replace: true });
      } else {
        await api("/employees", { method: "POST", body });
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors.length > 0) {
          const map: Record<string, string> = {};
          for (const fe of err.errors) {
            if (!map[fe.field]) map[fe.field] = fe.message;
          }
          setFieldErrors(map);
          setFormError("Periksa kembali isian yang ditandai");
        } else if (err.status === 409) {
          setFieldErrors({ email: "Email sudah digunakan" });
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Terjadi kesalahan");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" id="name" error={fieldErrors.name}>
          <input
            id="name"
            required
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Email" id="email" error={fieldErrors.email}>
          <input
            id="email"
            type="email"
            required
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="No. HP" id="phone" error={fieldErrors.phone}>
          <input
            id="phone"
            type="tel"
            required
            placeholder="081234567890"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Jabatan" id="position" error={fieldErrors.position}>
          <input
            id="position"
            required
            value={values.position}
            onChange={(e) => setField("position", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Department" id="departmentId" error={fieldErrors.departmentId}>
          <select
            id="departmentId"
            required
            value={values.departmentId}
            onChange={(e) => setField("departmentId", e.target.value)}
            className={inputClass}
          >
            <option value="">Pilih department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status" id="status" error={fieldErrors.status}>
          <select
            id="status"
            value={values.status}
            onChange={(e) => setField("status", e.target.value as EmployeeStatus)}
            className={inputClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </Field>

        <Field label="Tanggal masuk" id="hireDate" error={fieldErrors.hireDate}>
          <input
            id="hireDate"
            type="date"
            required
            value={values.hireDate}
            onChange={(e) => setField("hireDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          to={employee ? `/employees/${employee.id}` : "/"}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">
        &larr; Kembali ke daftar
      </Link>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {children}
    </div>
  );
}

export default function EmployeeFormPage() {
  const params = useParams();
  const isEdit = params.id !== undefined;
  const parsed = Number(params.id);
  const id = isEdit && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const { loading, employee, error } = useEmployee(id);

  if (!isEdit) {
    return (
      <Shell title="Tambah Karyawan">
        <EmployeeForm />
      </Shell>
    );
  }

  if (id === null) {
    return (
      <Shell title="Ubah Karyawan">
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Karyawan tidak ditemukan
        </p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell title="Ubah Karyawan">
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" aria-busy="true" aria-label="Memuat data" />
      </Shell>
    );
  }

  if (error || !employee) {
    return (
      <Shell title="Ubah Karyawan">
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Karyawan tidak ditemukan"}
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Ubah Karyawan">
      <EmployeeForm key={employee.id} employee={employee} />
    </Shell>
  );
}