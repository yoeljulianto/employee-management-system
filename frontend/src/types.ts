export type Role = "ADMIN" | "VIEWER";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export type Department = {
  id: number;
  name: string;
  _count?: { employees: number };
};

export type Employee = {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  departmentId: number;
  department: { id: number; name: string };
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};