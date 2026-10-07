import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

const users = [
  { name: "Admin", email: "admin@example.com", password: "Admin123!", role: "ADMIN" as const },
  { name: "Viewer", email: "viewer@example.com", password: "Viewer123!", role: "VIEWER" as const },
];

async function main() {
  console.log("Mulai seed...");

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    console.log("User siap:", u.email);
  }

  const total = await prisma.user.count();
  console.log("Seed selesai. Total user di database:", total);
}

main()
  .catch((err) => {
    console.error("Seed gagal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());