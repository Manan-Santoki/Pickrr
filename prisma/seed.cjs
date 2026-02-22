const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function main() {
  const existing = await db.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Admin user already exists");
    return;
  }

  const password = process.env.ADMIN_PASSWORD || "changeme";
  const hash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      username: "admin",
      password: hash,
      role: "admin",
      provider: "local",
    },
  });

  console.log("Admin user created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
