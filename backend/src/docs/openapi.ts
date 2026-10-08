const bearer = [{ bearerAuth: [] }];

const ref = (name: string) => ({ $ref: `#/components/responses/${name}` });
const schemaRef = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const ok = (description: string, schema: object) => ({ description, content: json(schema) });

const envelope = (data: object, extra: object = {}) => ({
  type: "object",
  properties: { success: { type: "boolean", example: true }, data, ...extra },
});

const message = (text: string) => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    message: { type: "string", example: text },
  },
});

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
  description: "ID data",
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Employee Management System API",
    version: "1.0.0",
    description: [
      "REST API pengelolaan data karyawan.",
      "",
      "**Cara memakai:**",
      "1. Buka `POST /auth/login`, klik **Try it out**, lalu **Execute**.",
      "2. Salin nilai `token` dari response (tanpa tanda kutip).",
      "3. Klik tombol **Authorize** di kanan atas, tempel token tersebut, lalu **Authorize**.",
      "4. Sekarang endpoint lain bisa dicoba dengan **Try it out** dan **Execute**.",
      "",
      "**Akun demo:**",
      "- Admin (akses penuh): `admin@example.com` / `Admin123!`",
      "- Viewer (hanya baca): `viewer@example.com` / `Viewer123!`",
      "",
      "Format sukses: `{ success: true, data }`. Format gagal: `{ success: false, message, errors? }`.",
    ].join("\n"),
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "System", description: "Pengecekan status server" },
    { name: "Auth", description: "Login dan identitas pengguna" },
    { name: "Departments", description: "Data departemen" },
    { name: "Employees", description: "Data karyawan" },
    { name: "Audit Logs", description: "Riwayat perubahan data (khusus admin)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    responses: {
      ValidationError: {
        description: "400 - Input tidak valid",
        content: json(schemaRef("ErrorResponse")),
      },
      Unauthorized: {
        description: "401 - Token tidak ada, tidak valid, atau kedaluwarsa",
        content: json(schemaRef("ErrorResponse")),
      },
      Forbidden: {
        description: "403 - Role tidak punya akses",
        content: json(schemaRef("ErrorResponse")),
      },
      NotFound: {
        description: "404 - Data tidak ditemukan",
        content: json(schemaRef("ErrorResponse")),
      },
      Conflict: {
        description: "409 - Data bentrok (duplikat atau masih dipakai)",
        content: json(schemaRef("ErrorResponse")),
      },
      TooManyRequests: {
        description: "429 - Terlalu banyak request",
        content: json(schemaRef("ErrorResponse")),
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validasi gagal" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "Format email tidak valid" },
              },
            },
          },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "admin@example.com" },
          password: { type: "string", example: "Admin123!" },
        },
      },
      DepartmentInput: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", minLength: 2, maxLength: 100, example: "Finance" } },
      },
      Department: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "IT" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          _count: {
            type: "object",
            description: "Hanya muncul di daftar department",
            properties: { employees: { type: "integer", example: 3 } },
          },
        },
      },
      EmployeeInput: {
        type: "object",
        required: ["name", "email", "phone", "position", "hireDate", "departmentId"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100, example: "Budi Santoso" },
          email: { type: "string", format: "email", example: "budi@example.com" },
          phone: { type: "string", example: "081234567890" },
          position: { type: "string", minLength: 2, maxLength: 100, example: "Backend Developer" },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
          hireDate: { type: "string", format: "date", example: "2024-03-01" },
          departmentId: { type: "integer", example: 1 },
        },
      },
      Employee: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Budi Santoso" },
          email: { type: "string", example: "budi@example.com" },
          phone: { type: "string", example: "081234567890" },
          position: { type: "string", example: "Backend Developer" },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          hireDate: { type: "string", format: "date-time" },
          departmentId: { type: "integer", example: 1 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          department: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              name: { type: "string", example: "IT" },
            },
          },
        },
      },
      PageMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 25 },
          totalPages: { type: "integer", example: 3 },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          userId: { type: "integer", example: 1 },
          action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE"] },
          entity: { type: "string", example: "employee" },
          entityId: { type: "integer", example: 5 },
          changes: { type: "object", nullable: true, description: "Data yang berubah (UPDATE berisi before dan after)" },
          createdAt: { type: "string", format: "date-time" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string", example: "Admin" },
              email: { type: "string", example: "admin@example.com" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check (server dan database)",
        responses: {
          "200": ok("Server dan database aktif", {
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              database: { type: "string", example: "connected" },
              uptime: { type: "integer", example: 120 },
              timestamp: { type: "string", format: "date-time" },
            },
          }),
          "503": { description: "Database tidak terjangkau" },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login dan dapatkan token JWT",
        description: "Dibatasi 10 percobaan gagal per 15 menit per IP.",
        requestBody: { required: true, content: json(schemaRef("LoginInput")) },
        responses: {
          "200": ok(
            "Login berhasil",
            envelope({
              type: "object",
              properties: {
                token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Admin" },
                    email: { type: "string", example: "admin@example.com" },
                    role: { type: "string", enum: ["ADMIN", "VIEWER"] },
                  },
                },
              },
            }),
          ),
          "400": ref("ValidationError"),
          "401": { description: "401 - Email atau password salah", content: json(schemaRef("ErrorResponse")) },
          "429": ref("TooManyRequests"),
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Lihat identitas pengguna dari token",
        security: bearer,
        responses: {
          "200": ok(
            "Identitas pengguna",
            envelope({
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                role: { type: "string", enum: ["ADMIN", "VIEWER"] },
              },
            }),
          ),
          "401": ref("Unauthorized"),
        },
      },
    },

    "/departments": {
      get: {
        tags: ["Departments"],
        summary: "Daftar department (semua role)",
        security: bearer,
        responses: {
          "200": ok("Daftar department", envelope({ type: "array", items: schemaRef("Department") })),
          "401": ref("Unauthorized"),
        },
      },
      post: {
        tags: ["Departments"],
        summary: "Tambah department (admin)",
        security: bearer,
        requestBody: { required: true, content: json(schemaRef("DepartmentInput")) },
        responses: {
          "201": ok("Department dibuat", envelope(schemaRef("Department"))),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
          "409": ref("Conflict"),
        },
      },
    },
    "/departments/{id}": {
      put: {
        tags: ["Departments"],
        summary: "Ubah department (admin)",
        security: bearer,
        parameters: [idParam],
        requestBody: { required: true, content: json(schemaRef("DepartmentInput")) },
        responses: {
          "200": ok("Department diubah", envelope(schemaRef("Department"))),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
          "404": ref("NotFound"),
          "409": ref("Conflict"),
        },
      },
      delete: {
        tags: ["Departments"],
        summary: "Hapus department (admin, hanya jika tidak punya karyawan)",
        security: bearer,
        parameters: [idParam],
        responses: {
          "200": ok("Department dihapus", message("Department berhasil dihapus")),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
          "404": ref("NotFound"),
          "409": ref("Conflict"),
        },
      },
    },

    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "Daftar karyawan dengan search, filter, sorting, dan pagination (semua role)",
        description: "Semua filter dan sorting dieksekusi di query database.",
        security: bearer,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Cari di nama, email, atau jabatan (tidak peduli huruf besar-kecil)",
          },
          { name: "departmentId", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
          {
            name: "sortBy",
            in: "query",
            schema: { type: "string", enum: ["name", "email", "position", "hireDate", "createdAt"], default: "createdAt" },
          },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          "200": ok(
            "Daftar karyawan",
            envelope({ type: "array", items: schemaRef("Employee") }, { meta: schemaRef("PageMeta") }),
          ),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
        },
      },
      post: {
        tags: ["Employees"],
        summary: "Tambah karyawan (admin)",
        security: bearer,
        requestBody: { required: true, content: json(schemaRef("EmployeeInput")) },
        responses: {
          "201": ok("Karyawan dibuat", envelope(schemaRef("Employee"))),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
          "409": ref("Conflict"),
        },
      },
    },
    "/employees/export": {
      get: {
        tags: ["Employees"],
        summary: "Unduh data karyawan sebagai CSV (semua role)",
        description: "Memakai filter dan sorting yang sama dengan daftar karyawan, tanpa pagination.",
        security: bearer,
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "departmentId", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
          {
            name: "sortBy",
            in: "query",
            schema: { type: "string", enum: ["name", "email", "position", "hireDate", "createdAt"], default: "createdAt" },
          },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          "200": {
            description: "File CSV",
            content: { "text/csv": { schema: { type: "string" } } },
          },
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
        },
      },
    },
    "/employees/{id}": {
      get: {
        tags: ["Employees"],
        summary: "Detail karyawan (semua role)",
        security: bearer,
        parameters: [idParam],
        responses: {
          "200": ok("Detail karyawan", envelope(schemaRef("Employee"))),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "404": ref("NotFound"),
        },
      },
      put: {
        tags: ["Employees"],
        summary: "Ubah karyawan (admin)",
        security: bearer,
        parameters: [idParam],
        requestBody: { required: true, content: json(schemaRef("EmployeeInput")) },
        responses: {
          "200": ok("Karyawan diubah", envelope(schemaRef("Employee"))),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
          "404": ref("NotFound"),
          "409": ref("Conflict"),
        },
      },
      delete: {
        tags: ["Employees"],
        summary: "Hapus karyawan (admin)",
        security: bearer,
        parameters: [idParam],
        responses: {
          "200": ok("Karyawan dihapus", message("Karyawan berhasil dihapus")),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
          "404": ref("NotFound"),
        },
      },
    },

    "/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        summary: "Riwayat perubahan data (admin)",
        security: bearer,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "entity", in: "query", schema: { type: "string", example: "employee" } },
          { name: "action", in: "query", schema: { type: "string", enum: ["CREATE", "UPDATE", "DELETE"] } },
          { name: "userId", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": ok(
            "Daftar audit log",
            envelope({ type: "array", items: schemaRef("AuditLog") }, { meta: schemaRef("PageMeta") }),
          ),
          "400": ref("ValidationError"),
          "401": ref("Unauthorized"),
          "403": ref("Forbidden"),
        },
      },
    },
  },
};