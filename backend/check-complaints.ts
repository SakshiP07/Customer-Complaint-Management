import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const complaints = await prisma.complaint.findMany({
    where: { channel: { code: 'YOUTUBE' } },
    include: { channel: true }
  });
  console.log("YouTube Complaints count:", complaints.length);
  if (complaints.length > 0) {
    console.log("Latest:", JSON.stringify(complaints[complaints.length - 1], null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
