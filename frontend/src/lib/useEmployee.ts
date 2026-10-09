import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { Employee } from "../types";

type State = { id: number; employee?: Employee; error?: string };

export function useEmployee(id: number | null) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;

    api<{ data: Employee }>(`/employees/${id}`)
      .then((res) => {
        if (!cancelled) setState({ id, employee: res.data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ id, error: err instanceof ApiError ? err.message : "Terjadi kesalahan" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const ready = id !== null && state?.id === id;

  return {
    loading: id !== null && !ready,
    employee: ready ? state?.employee : undefined,
    error: ready ? state?.error : undefined,
  };
}