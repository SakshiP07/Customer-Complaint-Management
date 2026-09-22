import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up mock/demo data while preserving essential setup...");

  // Delete ALL complaints (they're all from seed data)
  const deletedComplaints = await prisma.complaint.deleteMany({});

  // Reset complaint sequence to 0
  const currentYear = new Date().getFullYear();
  await prisma.complaintSequence.upsert({
    where: { year: currentYear },
    update: { lastNumber: 0 },
    create: { year: currentYear, lastNumber: 0 },
  });

  // Delete demo customer profiles (those with @example.com that aren't linked to users)
  const deletedCustomers = await prisma.customerProfile.deleteMany({
    where: {
      email: { contains: "@example.com" },
      user: { is: null },
    },
  });

  // Update system setting to remove DEMO classification
  await prisma.systemSetting.upsert({
    where: { key: "data.classification" },
    update: { value: "LIVE DATA" },
    create: { key: "data.classification", value: "LIVE DATA" },
  });

  console.log(`Cleanup complete. Deleted ${deletedComplaints.count} demo complaints and ${deletedCustomers.count} demo customer profiles.`);
  console.log("Essential setup data (roles, regions, stores, categories, users) preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
