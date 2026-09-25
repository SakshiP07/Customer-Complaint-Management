import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.map(u => ({ email: u.email, isActive: u.isActive, roleId: u.roleId })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
