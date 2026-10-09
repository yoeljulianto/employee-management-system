export type Role = "ADMIN" | "VIEWER";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};