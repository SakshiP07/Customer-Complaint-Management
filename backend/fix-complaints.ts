import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const channel = await prisma.complaintChannel.findFirst({ where: { code: "YOUTUBE" } });
  if (channel) {
    const updated = await prisma.complaint.updateMany({
      where: { channelId: channel.id, companyId: null },
      data: { companyId: channel.companyId }
    });
    console.log(`Updated ${updated.count} YouTube complaints to have companyId: ${channel.companyId}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
