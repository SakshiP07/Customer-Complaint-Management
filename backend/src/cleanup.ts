import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const keepEmails = ['admin@example.com', 'manager@example.com', 'agent@example.com', 'customer@example.com'];
  
  // Find the customer we are keeping
  const mainProfile = await prisma.customerProfile.findFirst({ where: { email: 'customer@example.com' } });

  if (mainProfile) {
    // Reassign all complaints to the main customer
    await prisma.complaint.updateMany({
      where: {
        customer: { email: { notIn: keepEmails } }
      },
      data: {
        customerId: mainProfile.id
      }
    });
  }

  const usersToDelete = await prisma.user.findMany({
    where: { email: { notIn: keepEmails } }
  });

  console.log(`Found ${usersToDelete.length} users to delete.`);

  // Delete customer profiles for the dummy users
  await prisma.customerProfile.deleteMany({
    where: { email: { notIn: keepEmails } }
  });

  // Delete users
  await prisma.user.deleteMany({
    where: { email: { notIn: keepEmails } }
  });

  console.log('Done cleaning up dummy users.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
