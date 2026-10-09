import type { EmployeeStatus } from "../types";

export default function StatusBadge({ status }: { status: EmployeeStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}