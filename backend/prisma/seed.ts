import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "DemoPass123!";

async function main() {
  console.log("Seeding BASE DATA — infrastructure for email/YouTube integrations.");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Create default company (or get existing)
  const company = await prisma.company.upsert({
    where: { slug: "default-company" },
    update: {},
    create: {
      name: "Default Company",
      slug: "default-company",
      isActive: true,
    },
  });

  // Create roles (or get existing)
  const roles = await Promise.all(
    [
      ["CUSTOMER", "Customer"],
      ["AGENT", "Customer Service Agent"],
      ["OPERATIONS_MANAGER", "Operations Manager"],
      ["REGIONAL_MANAGER", "Regional Manager"],
      ["ADMIN", "Administrator"],
      ["SUPER_ADMIN", "Super Administrator"],
    ].map(([code, name]) =>
      prisma.role.upsert({
        where: { code },
        update: {},
        create: { code: code as never, name, description: `${name} role` },
      }),
    ),
  );

  // Create default region (needed for complaints)
  const region = await prisma.region.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: {
      name: "Default Region",
      code: "DEFAULT",
      description: "Default region for incoming complaints",
      companyId: company.id,
    },
  });

  // Create default category (needed for complaints)
  const category = await prisma.complaintCategory.upsert({
    where: { code: "GENERAL" },
    update: {},
    create: {
      name: "General",
      code: "GENERAL",
      description: "General complaint category",
      companyId: company.id,
    },
  });

  // Create channels (needed for integrations)
  for (const channelData of [
    { name: "Website", code: "WEBSITE", adapterKey: "website", description: "Website submissions" },
    { name: "Email", code: "EMAIL", adapterKey: "email", description: "Email submissions" },
    { name: "YouTube", code: "YOUTUBE", adapterKey: "youtube", description: "YouTube comments" },
  ]) {
    await prisma.complaintChannel.upsert({
      where: { code: channelData.code },
      update: {},
      create: { ...channelData, companyId: company.id },
    });
  }

  // Create default priorities
  for (const priorityData of [
    { code: "LOW", name: "Low", rank: 1, color: "#64748b" },
    { code: "MEDIUM", name: "Medium", rank: 2, color: "#2563eb" },
    { code: "HIGH", name: "High", rank: 3, color: "#d97706" },
    { code: "CRITICAL", name: "Critical", rank: 4, color: "#dc2626" },
  ]) {
    await prisma.priorityConfig.upsert({
      where: { code: priorityData.code },
      update: {},
      create: { ...priorityData, companyId: company.id },
    });
  }

  // Create default SLA policy
  await prisma.sLAPolicy.upsert({
    where: { id: "default-sla" },
    update: {},
    create: {
      id: "default-sla",
      name: "Default SLA",
      priorityCode: "MEDIUM",
      responseTimeMinutes: 60,
      resolutionTimeMinutes: 24 * 60,
      escalationThresholdMinutes: 12 * 60,
      approachingPercent: 80,
      isDemo: false,
      companyId: company.id,
    },
  });

  // Create super admin user
  const superAdminRole = roles.find((r) => r.code === "SUPER_ADMIN")!;
  const agentRole = roles.find((r) => r.code === "AGENT")!;
  const managerRole = roles.find((r) => r.code === "OPERATIONS_MANAGER")!;
  const customerRole = roles.find((r) => r.code === "CUSTOMER")!;

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@example.com",
      phone: "+910000000001",
      passwordHash,
      roleId: superAdminRole.id,
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {},
    create: {
      name: "Agent User",
      email: "agent@example.com",
      phone: "+910000000002",
      passwordHash,
      roleId: agentRole.id,
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      name: "Operations Manager",
      email: "manager@example.com",
      phone: "+910000000003",
      passwordHash,
      roleId: managerRole.id,
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      name: "Customer User",
      email: "customer@example.com",
      phone: "+910000000004",
      passwordHash,
      roleId: customerRole.id,
      companyId: company.id,
      customerProfile: {
        create: {
          name: "Customer User",
          email: "customer@example.com",
          phone: "+910000000004",
          preferredContactMethod: "EMAIL",
        },
      },
    },
  });

  console.log("Base seed complete. Infrastructure data created.");
  console.log("Demo credentials (all use password: DemoPass123!):");
  console.log("  - admin@example.com (Super Admin)");
  console.log("  - agent@example.com (Agent)");
  console.log("  - manager@example.com (Operations Manager)");
  console.log("  - customer@example.com (Customer)");
  console.log("Email and YouTube integrations can now create real complaints.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
