import type { User } from "../types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

const TOKEN_KEY = "ems_token";
const USER_KEY = "ems_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  status: number;
  errors: FieldError[];

  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = { method?: string; body?: unknown };

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server", 0);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearSession();
      window.location.assign("/login");
    }
    throw new ApiError(body?.message ?? "Terjadi kesalahan", res.status, body?.errors ?? []);
  }

  return body as T;
}

export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server", 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 401 && token) {
      clearSession();
      window.location.assign("/login");
    }
    throw new ApiError(body?.message ?? "Gagal mengunduh file", res.status, body?.errors ?? []);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}