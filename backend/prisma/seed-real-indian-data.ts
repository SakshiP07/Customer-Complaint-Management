import { PrismaClient, RoleCode, ComplaintStatus, SlaStatus, CommentVisibility, MessageSender, MessageDeliveryStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "DemoPass123!";

async function main() {
  console.log("🇮🇳 Starting Real Indian Data Seeding...");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Clean up old mock complaints, history, comments, conversations, and demo customers
  console.log("Cleaning up outdated mock data...");
  await prisma.conversationMessage.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.aIAnalysis.deleteMany({});
  await prisma.escalation.deleteMany({});
  await prisma.sLARecord.deleteMany({});
  await prisma.complaintAssignment.deleteMany({});
  await prisma.complaintAttachment.deleteMany({});
  await prisma.complaintComment.deleteMany({});
  await prisma.complaintStatusHistory.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.customerProfile.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});

  const currentYear = new Date().getFullYear();
  await prisma.complaintSequence.upsert({
    where: { year: currentYear },
    update: { lastNumber: 0 },
    create: { year: currentYear, lastNumber: 0 },
  });

  // 2. Company & Roles
  const company = await prisma.company.upsert({
    where: { slug: "complaintos-india" },
    update: { name: "ComplaintOS India Enterprises" },
    create: {
      name: "ComplaintOS India Enterprises",
      slug: "complaintos-india",
      isActive: true,
    },
  });

  const rolesList = [
    { code: RoleCode.SUPER_ADMIN, name: "Super Administrator", description: "Full system administration access" },
    { code: RoleCode.ADMIN, name: "Administrator", description: "Platform and operations administrator" },
    { code: RoleCode.OPERATIONS_MANAGER, name: "Operations Manager", description: "Oversees complaint resolution operations and SLAs" },
    { code: RoleCode.REGIONAL_MANAGER, name: "Regional Manager", description: "Manages regional store clusters and teams" },
    { code: RoleCode.AGENT, name: "Customer Support Agent", description: "Handles and resolves customer tickets" },
    { code: RoleCode.CUSTOMER, name: "Customer", description: "Customer portal user" },
  ];

  const roles: Record<string, { id: string; code: RoleCode }> = {};
  for (const r of rolesList) {
    const roleRecord = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: { code: r.code, name: r.name, description: r.description },
    });
    roles[r.code] = roleRecord;
  }

  // 3. Realistic Indian Regions
  const regionsData = [
    { code: "WEST", name: "West Zone (Maharashtra & Gujarat)", description: "Mumbai, Pune, Ahmedabad, Surat" },
    { code: "NORTH", name: "North Zone (Delhi NCR & Punjab)", description: "New Delhi, Noida, Gurugram, Chandigarh" },
    { code: "SOUTH", name: "South Zone (Karnataka, TN & Telangana)", description: "Bengaluru, Chennai, Hyderabad, Kochi" },
    { code: "EAST", name: "East Zone (West Bengal & Odisha)", description: "Kolkata, Howrah, Bhubaneswar, Patna" },
  ];

  const regions: Record<string, { id: string; code: string }> = {};
  for (const reg of regionsData) {
    const rec = await prisma.region.upsert({
      where: { code: reg.code },
      update: { name: reg.name, description: reg.description, companyId: company.id },
      create: { ...reg, companyId: company.id },
    });
    regions[reg.code] = rec;
  }

  // 4. Realistic Indian Stores / Outlets
  const storesData = [
    { code: "MUM-PHX", name: "Phoenix Palladium Mall Store", address: "High Street Phoenix, Lower Parel", city: "Mumbai", state: "Maharashtra", regionId: regions["WEST"].id },
    { code: "MUM-BND", name: "Linking Road Flagship Outlet", address: "Linking Road, Bandra West", city: "Mumbai", state: "Maharashtra", regionId: regions["WEST"].id },
    { code: "PUN-VIM", name: "Phoenix Marketcity Viman Nagar", address: "Viman Nagar, Pune", city: "Pune", state: "Maharashtra", regionId: regions["WEST"].id },
    { code: "BLR-IND", name: "100ft Road Experience Center", address: "100 Feet Road, Indiranagar", city: "Bengaluru", state: "Karnataka", regionId: regions["SOUTH"].id },
    { code: "BLR-KOR", name: "Nexus Mall Koramangala", address: "Hosur Road, Koramangala", city: "Bengaluru", state: "Karnataka", regionId: regions["SOUTH"].id },
    { code: "HYD-HIC", name: "Inorbit Mall Cyberabad", address: "Mindspace, Hitec City", city: "Hyderabad", state: "Telangana", regionId: regions["SOUTH"].id },
    { code: "DEL-CON", name: "Connaught Place Flagship", address: "Inner Circle, Connaught Place", city: "New Delhi", state: "Delhi NCR", regionId: regions["NORTH"].id },
    { code: "DEL-SCK", name: "Select Citywalk Saket", address: "District Centre, Saket", city: "New Delhi", state: "Delhi NCR", regionId: regions["NORTH"].id },
    { code: "GUR-AMB", name: "Ambience Mall Gurugram", address: "NH-8, Ambience Island", city: "Gurugram", state: "Haryana", regionId: regions["NORTH"].id },
    { code: "KOL-PKS", name: "Park Street Heritage Store", address: "Park Street, Central Kolkata", city: "Kolkata", state: "West Bengal", regionId: regions["EAST"].id },
    { code: "KOL-SCT", name: "South City Mall Outlet", address: "Prince Anwar Shah Road", city: "Kolkata", state: "West Bengal", regionId: regions["EAST"].id },
  ];

  const stores: Record<string, { id: string; code: string; name: string }> = {};
  for (const st of storesData) {
    const rec = await prisma.store.upsert({
      where: { code: st.code },
      update: { name: st.name, address: st.address, city: st.city, state: st.state, regionId: st.regionId, companyId: company.id },
      create: { ...st, companyId: company.id },
    });
    stores[st.code] = rec;
  }

  // 5. Complaint Categories
  const categoriesData = [
    { code: "PAYMENT_UPI", name: "UPI & Payment Gateway Failures", description: "UPI deduction without receipt, failed POS swipe, double debits" },
    { code: "BILLING_MRP", name: "Billing Discrepancies & MRP Overcharge", description: "Prices exceeding printed MRP, wrong discount calculation, cashier bill error" },
    { code: "PRODUCT_QUALITY", name: "Damaged / Expired / Defective Goods", description: "Broken packaging, expired food or FMCG items, defective electronics" },
    { code: "DELIVERY_DELAY", name: "Express Delivery Delay & Missing Items", description: "Late delivery, missing items in package, incorrect order delivered" },
    { code: "RETURN_REFUND", name: "Refund Delay & Reverse Pickup Issues", description: "Pickup executive no-show, delayed bank refund credit, replacement pending" },
    { code: "STAFF_BEHAVIOUR", name: "Staff Conduct & Store Experience", description: "Rude billing staff, refusal of return at counter, long billing queues" },
    { code: "WARRANTY_SERVICE", name: "Warranty Claims & Technician No-Show", description: "Appliance repair delay, warranty rejection, authorized center issues" },
    { code: "LOYALTY_OFFERS", name: "Coupon Code & Loyalty Point Errors", description: "Discount code not applied, reward points deducted without credit" },
  ];

  const categories: Record<string, { id: string; code: string; name: string }> = {};
  for (const cat of categoriesData) {
    const rec = await prisma.complaintCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, companyId: company.id },
      create: { ...cat, companyId: company.id },
    });
    categories[cat.code] = rec;
  }

  // 6. Ingestion Channels
  const channelsData = [
    { code: "WEBSITE", name: "Website Portal", adapterKey: "website", description: "Customer self-service portal submissions" },
    { code: "WHATSAPP", name: "WhatsApp Business Support", adapterKey: "whatsapp", description: "Direct WhatsApp conversational tickets" },
    { code: "EMAIL", name: "Email Ingestion (IMAP)", adapterKey: "email", description: "Official support email inbox" },
    { code: "GOOGLE_REVIEW", name: "Google Maps & Store Reviews", adapterKey: "google_review", description: "Escalations from Google local store reviews" },
    { code: "YOUTUBE", name: "YouTube Comments", adapterKey: "youtube", description: "Brand channel video feedback and grievances" },
    { code: "X", name: "X (Twitter) Support", adapterKey: "x", description: "Public and direct messages on X" },
    { code: "STORE_DESK", name: "Store Helpdesk (Walk-in)", adapterKey: "store_desk", description: "In-store customer service counter escalations" },
  ];

  const channels: Record<string, { id: string; code: string; name: string }> = {};
  for (const ch of channelsData) {
    const rec = await prisma.complaintChannel.upsert({
      where: { code: ch.code },
      update: { name: ch.name, description: ch.description, adapterKey: ch.adapterKey, companyId: company.id },
      create: { ...ch, companyId: company.id },
    });
    channels[ch.code] = rec;
  }

  // 7. Priorities & SLA Policies
  const prioritiesData = [
    { code: "LOW", name: "Low Priority", rank: 1, color: "#64748b" },
    { code: "MEDIUM", name: "Medium Priority", rank: 2, color: "#2563eb" },
    { code: "HIGH", name: "High Priority", rank: 3, color: "#d97706" },
    { code: "CRITICAL", name: "Critical Escalation", rank: 4, color: "#dc2626" },
  ];

  for (const pr of prioritiesData) {
    await prisma.priorityConfig.upsert({
      where: { code: pr.code },
      update: { name: pr.name, rank: pr.rank, color: pr.color, companyId: company.id },
      create: { ...pr, companyId: company.id },
    });
  }

  const slaPolicy = await prisma.sLAPolicy.upsert({
    where: { id: "standard-india-sla" },
    update: {
      name: "Standard India Consumer SLA",
      priorityCode: "MEDIUM",
      responseTimeMinutes: 60,
      resolutionTimeMinutes: 24 * 60,
      escalationThresholdMinutes: 12 * 60,
      approachingPercent: 80,
      isDemo: false,
      companyId: company.id,
    },
    create: {
      id: "standard-india-sla",
      name: "Standard India Consumer SLA",
      priorityCode: "MEDIUM",
      responseTimeMinutes: 60,
      resolutionTimeMinutes: 24 * 60,
      escalationThresholdMinutes: 12 * 60,
      approachingPercent: 80,
      isDemo: false,
      companyId: company.id,
    },
  });

  // 8. Staff Users (Clean Demo Logins preserved with real Indian identities)
  const staffMembers = [
    {
      name: "Vikramaditya Singhania",
      email: "admin@example.com",
      phone: "+91 98201 00001",
      roleCode: RoleCode.SUPER_ADMIN,
      regionCode: "WEST",
    },
    {
      name: "Pooja Iyer",
      email: "manager@example.com",
      phone: "+91 98450 00002",
      roleCode: RoleCode.OPERATIONS_MANAGER,
      regionCode: "SOUTH",
    },
    {
      name: "Rohan Kulkarni",
      email: "agent@example.com",
      phone: "+91 98202 00003",
      roleCode: RoleCode.AGENT,
      regionCode: "WEST",
      storeCode: "MUM-PHX",
    },
    {
      name: "Ananya Verma",
      email: "ananya.verma@complaintos.in",
      phone: "+91 99100 00004",
      roleCode: RoleCode.REGIONAL_MANAGER,
      regionCode: "NORTH",
    },
    {
      name: "Suresh Ramakrishnan",
      email: "suresh.r@complaintos.in",
      phone: "+91 94440 00005",
      roleCode: RoleCode.REGIONAL_MANAGER,
      regionCode: "SOUTH",
    },
    {
      name: "Neha Sharma",
      email: "neha.sharma@complaintos.in",
      phone: "+91 98110 00006",
      roleCode: RoleCode.AGENT,
      regionCode: "NORTH",
      storeCode: "DEL-CON",
    },
    {
      name: "Aditya Patel",
      email: "aditya.patel@complaintos.in",
      phone: "+91 97270 00007",
      roleCode: RoleCode.AGENT,
      regionCode: "WEST",
      storeCode: "MUM-BND",
    },
    {
      name: "Debashish Banerjee",
      email: "debashish.b@complaintos.in",
      phone: "+91 98300 00008",
      roleCode: RoleCode.AGENT,
      regionCode: "EAST",
      storeCode: "KOL-PKS",
    },
    {
      name: "Kavita Reddy",
      email: "kavita.reddy@complaintos.in",
      phone: "+91 98490 00009",
      roleCode: RoleCode.AGENT,
      regionCode: "SOUTH",
      storeCode: "BLR-IND",
    },
  ];

  const staffUsers: Record<string, { id: string; name: string; email: string }> = {};
  for (const s of staffMembers) {
    const userRec = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        phone: s.phone,
        passwordHash,
        roleId: roles[s.roleCode].id,
        companyId: company.id,
        regionId: s.regionCode ? regions[s.regionCode].id : null,
        storeId: s.storeCode ? stores[s.storeCode]?.id : null,
        isActive: true,
      },
    });
    staffUsers[s.email] = userRec;
  }

  // 9. Real Indian Customer Accounts
  const customersData = [
    {
      name: "Aarav Mehta",
      email: "customer@example.com",
      phone: "+91 98201 55432",
      city: "Mumbai",
      regionCode: "WEST",
      prefContact: "WHATSAPP",
    },
    {
      name: "Rajesh Kumar Sharma",
      email: "rajesh.sharma82@gmail.com",
      phone: "+91 98201 44812",
      city: "Mumbai",
      regionCode: "WEST",
      prefContact: "PHONE",
    },
    {
      name: "Sneha Deshmukh",
      email: "sneha.deshmukh@yahoo.co.in",
      phone: "+91 98450 19283",
      city: "Bengaluru",
      regionCode: "SOUTH",
      prefContact: "EMAIL",
    },
    {
      name: "Vikramaditya Joshi",
      email: "vikram.joshi@outlook.com",
      phone: "+91 99102 78394",
      city: "New Delhi",
      regionCode: "NORTH",
      prefContact: "WHATSAPP",
    },
    {
      name: "Deepika Patel",
      email: "deepika.patel@gmail.com",
      phone: "+91 97274 56120",
      city: "Ahmedabad",
      regionCode: "WEST",
      prefContact: "EMAIL",
    },
    {
      name: "Amitabha Mukherjee",
      email: "amitabha.m@rediffmail.com",
      phone: "+91 98301 92834",
      city: "Kolkata",
      regionCode: "EAST",
      prefContact: "PHONE",
    },
    {
      name: "Kavitha Sundaram",
      email: "kavitha.sundaram@gmail.com",
      phone: "+91 94440 81923",
      city: "Chennai",
      regionCode: "SOUTH",
      prefContact: "EMAIL",
    },
    {
      name: "Harshvardhan Rathi",
      email: "harsh.rathi@gmail.com",
      phone: "+91 98290 33419",
      city: "Jaipur",
      regionCode: "NORTH",
      prefContact: "WHATSAPP",
    },
    {
      name: "Sunita Agarwal",
      email: "sunita.agarwal99@gmail.com",
      phone: "+91 98112 40591",
      city: "Gurugram",
      regionCode: "NORTH",
      prefContact: "EMAIL",
    },
    {
      name: "Mohammed Tariq",
      email: "tariq.md89@gmail.com",
      phone: "+91 98490 29384",
      city: "Hyderabad",
      regionCode: "SOUTH",
      prefContact: "PHONE",
    },
    {
      name: "Pooja Hegde",
      email: "pooja.hegde@gmail.com",
      phone: "+91 99001 82736",
      city: "Bengaluru",
      regionCode: "SOUTH",
      prefContact: "WHATSAPP",
    },
    {
      name: "Manpreet Kaur",
      email: "manpreet.k88@gmail.com",
      phone: "+91 98140 55219",
      city: "Chandigarh",
      regionCode: "NORTH",
      prefContact: "EMAIL",
    },
    {
      name: "Siddharth Roy",
      email: "sid.roy@gmail.com",
      phone: "+91 98310 66291",
      city: "Kolkata",
      regionCode: "EAST",
      prefContact: "EMAIL",
    },
    {
      name: "Ritu Mathur",
      email: "ritu.mathur@yahoo.com",
      phone: "+91 98260 74829",
      city: "Pune",
      regionCode: "WEST",
      prefContact: "WHATSAPP",
    },
    {
      name: "Gaurav Bhatia",
      email: "gaurav.bhatia@gmail.com",
      phone: "+91 98100 99281",
      city: "Noida",
      regionCode: "NORTH",
      prefContact: "PHONE",
    },
  ];

  const customerProfiles: Array<{ id: string; userId: string; name: string; email: string; phone: string; regionCode: string }> = [];

  for (const cust of customersData) {
    const userRec = await prisma.user.create({
      data: {
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        passwordHash,
        roleId: roles[RoleCode.CUSTOMER].id,
        companyId: company.id,
        regionId: regions[cust.regionCode].id,
        isActive: true,
        customerProfile: {
          create: {
            name: cust.name,
            email: cust.email,
            phone: cust.phone,
            preferredContactMethod: cust.prefContact,
            companyId: company.id,
          },
        },
      },
      include: { customerProfile: true },
    });
    if (userRec.customerProfile) {
      customerProfiles.push({
        id: userRec.customerProfile.id,
        userId: userRec.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        regionCode: cust.regionCode,
      });
    }
  }

  // 10. Real Indian Retail Complaints Dataset
  const complaintsData = [
    {
      custIdx: 0, // Aarav Mehta
      categoryCode: "PAYMENT_UPI",
      channelCode: "WHATSAPP",
      storeCode: "MUM-PHX",
      regionCode: "WEST",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      subject: "UPI Debited Rs. 4,250 via GPay but POS Counter showed Payment Failed (UTR: 429182910281)",
      description: "I was at the Phoenix Palladium Lower Parel store billing counter #3 at 7:45 PM. I scanned the store dynamic QR code using Google Pay for bill amount Rs. 4,250. Money got debited instantly from my HDFC account (UPI Ref/UTR: 429182910281). However the billing terminal showed 'Transaction Timeout'. Cashier insisted I pay again by credit card, resulting in double deduction. Please verify bank settlement and refund Rs. 4,250 immediately.",
      assignedAgentEmail: "agent@example.com",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Hi, I faced double payment deduction at Palladium store today. Attached screenshot of UPI reference 429182910281." },
        { sender: MessageSender.EMPLOYEE, text: "Namaste Aarav ji. We have received your transaction reference. Our accounts team is reconciling the PineLabs POS terminal settlement batch right now." },
        { sender: MessageSender.EMPLOYEE, text: "We have confirmed the unmapped credit in our merchant account. Reversal has been initiated to your bank account via NPCI (Estimated 24-48 hrs)." },
      ],
      comments: [
        { author: "Rohan Kulkarni", text: "PineLabs terminal batch reconciliation verified. Merchant settlement ID #PL-99210 confirmed Rs. 4,250 received. Reversal queued." },
      ],
      aiSuggestion: {
        summary: "Customer charged twice for Rs. 4,250 at Mumbai Palladium store due to POS timeout after successful GPay UPI transfer.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Aarav Mehta, we sincerely regret the inconvenience. We have verified transaction UTR 429182910281 with our banking partner. The refund of Rs. 4,250 has been released and will reflect in your HDFC account within 24-48 business hours.",
        suggestedNextSteps: ["Verify PineLabs gateway logs", "Confirm NPCI settlement status", "Trigger automated refund receipt email"],
        confidence: 0.94,
      },
    },
    {
      custIdx: 1, // Rajesh Kumar Sharma
      categoryCode: "BILLING_MRP",
      channelCode: "WEBSITE",
      storeCode: "MUM-BND",
      regionCode: "WEST",
      priority: "CRITICAL",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.APPROACHING,
      subject: "Overcharged Rs. 85 above printed MRP on Amul Cow Ghee 1L Tin at Bandra West Outlet",
      description: "Visited the Bandra Linking Road outlet on Sunday afternoon. Purchased Amul Pure Cow Ghee 1L Tin (Batch No: AG-204). The printed MRP on the package was clearly Rs. 650 incl. of all taxes, but the cashier billed it at Rs. 735 under barcode 8901262010150. When pointed out, the cashier argued that new stock rates have increased and refused to adjust the bill. This violates Legal Metrology Rules 2011.",
      assignedAgentEmail: "aditya.patel@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Billing staff at Bandra charged Rs 735 instead of MRP 650 printed on tin. Bill #INV-MUM-88219. Kindly investigate." },
        { sender: MessageSender.EMPLOYEE, text: "Hello Mr. Sharma, this is an unacceptable breach of our retail policy. We are pulling up the store inventory batch records immediately." },
      ],
      comments: [
        { author: "Pooja Iyer", text: "Escalated to Bandra Store Manager. Barcode mismatch detected between old batch physical inventory and SAP system price master update." },
      ],
      aiSuggestion: {
        summary: "Overcharging complaint at Bandra outlet where customer was billed Rs. 735 against Rs. 650 printed MRP on Amul Ghee.",
        suggestedPriority: "CRITICAL",
        suggestedResponse: "Dear Mr. Rajesh Sharma, we take Legal Metrology compliance very seriously. We have audited the Bandra store price master and corrected the barcode mismatch. We are issuing an immediate refund of the excess Rs. 85 along with a Rs. 250 apology voucher.",
        suggestedNextSteps: ["Audit store price master vs physical shelf tags", "Reprimand cashier for policy non-compliance", "Credit instant refund to customer wallet"],
        confidence: 0.96,
      },
    },
    {
      custIdx: 2, // Sneha Deshmukh
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "WHATSAPP",
      storeCode: "BLR-KOR",
      regionCode: "SOUTH",
      priority: "HIGH",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      subject: "Delivered Expired Aashirvaad Superior MP Sharbati Atta 10kg in Quick Commerce Order #BLR-40192",
      description: "Received my 10-minute grocery delivery in Koramangala 4th Block today. The 10kg Aashirvaad Sharbati Atta bag (Mfg: Oct 2025, Best Before 6 months - Expired April 2026) was delivered torn and infested with weevils. We have elderly members at home and this is a serious health hazard. Need immediate replacement and strict audit of dark store hygiene.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      resolution: "Replacement 10kg fresh batch Atta bag (Mfg: Aug 2026) delivered via express courier within 45 minutes. Dark store inventory batch quarantined.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Look at the photos of the flour bag delivered today. It is infested and past expiry date!" },
        { sender: MessageSender.EMPLOYEE, text: "Sneha ji, we are extremely sorry for this grave oversight. An express delivery rider has been dispatched with a fresh replacement right away." },
        { sender: MessageSender.CUSTOMER, text: "Received the replacement packet in fresh condition. Thank you for resolving it within an hour." },
      ],
      comments: [
        { author: "Kavita Reddy", text: "Koramangala dark store manager warned. 14 units from expired batch #ASH-09 quarantined and destroyed." },
      ],
      aiSuggestion: {
        summary: "Customer received expired and damaged 10kg flour packet via Koramangala delivery hub.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Sneha Deshmukh, we deeply regret this quality lapse. Our quality assurance team has quarantined the entire batch at the Koramangala hub.",
        suggestedNextSteps: ["Immediate dark store physical audit", "Log vendor QA ticket with supplier ITC"],
        confidence: 0.91,
      },
    },
    {
      custIdx: 3, // Vikramaditya Joshi
      categoryCode: "WARRANTY_SERVICE",
      channelCode: "EMAIL",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      subject: "Havells 25L Storage Geyser Installation Pending for 5 Days - Service Technician No-Show",
      description: "Purchased a Havells Monza EC 25L Water Geyser (Invoice #DEL-CP-49102, Rs. 11,490) from Connaught Place outlet on 18th Sept. Store promised authorized installation within 24 hours. Service request #HVL-DEL-8819 was generated, but technician has postponed thrice giving excuses of traffic and parts unavailability. Winter is approaching in Delhi and family is facing immense trouble.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "I have been calling Havells toll-free and store desk for 5 days. Nobody has turned up to mount the geyser." },
        { sender: MessageSender.EMPLOYEE, text: "Dear Mr. Joshi, we have escalated this directly to the Havells North Regional Service Manager. A senior technician has been scheduled for tomorrow 11:00 AM." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Spoke with Havells North Head of Service. Confirmed technician Mr. Ramesh Kumar (Phone: +91 98118 72109) assigned for visit." },
      ],
      aiSuggestion: {
        summary: "Delayed appliance installation for Havells 25L Geyser purchased at CP store; technician repeatedly failed to arrive.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Mr. Vikramaditya Joshi, we sincerely apologize for the delay. We have expedited ticket #HVL-DEL-8819 with the authorized Havells technician team.",
        suggestedNextSteps: ["Coordinate priority visit with Havells OEM", "Provide customer direct phone number of lead technician"],
        confidence: 0.88,
      },
    },
    {
      custIdx: 4, // Deepika Patel
      categoryCode: "RETURN_REFUND",
      channelCode: "WEBSITE",
      storeCode: "PUN-VIM",
      regionCode: "WEST",
      priority: "MEDIUM",
      status: ComplaintStatus.NEW,
      slaStatus: SlaStatus.ON_TRACK,
      subject: "Reverse Pickup Pending for Wrong Size Woodland Leather Boots (Size 9 UK instead of 7 UK)",
      description: "Ordered Woodland Men's Khaki Leather Trekking Boots Size 7 UK (Order ID #WD-83921). Delivered package contained Size 9 UK. Return request was accepted on 19th Sept and pickup promised by Delhivery courier by 21st Sept. No delivery person has contacted or arrived for pickup.",
      assignedAgentEmail: "agent@example.com",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "My return pickup OTP was generated but delivery agent did not arrive." },
      ],
      comments: [],
      aiSuggestion: {
        summary: "Return pickup delay by logistics partner for wrong size footwear order.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Deepika Patel, we apologize for the pickup delay. We have re-triggered a priority reverse pickup with Delhivery for today between 2 PM - 6 PM.",
        suggestedNextSteps: ["Re-assign logistics reverse pickup token", "Notify customer of courier partner tracking link"],
        confidence: 0.85,
      },
    },
    {
      custIdx: 5, // Amitabha Mukherjee
      categoryCode: "STAFF_BEHAVIOUR",
      channelCode: "GOOGLE_REVIEW",
      storeCode: "KOL-PKS",
      regionCode: "EAST",
      priority: "MEDIUM",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      subject: "Uncooperative & Rude Behavior by Billing Supervisor Regarding Loyalty Points Redemption at Park Street",
      description: "Visited Park Street store for Durga Puja festive shopping (Total bill ~Rs. 18,500). Had 4,500 accumulated Club Reward Points (Value Rs. 1,125). Billing desk supervisor Mr. Subhash refused to apply points claiming 'server down during festive hours' while laughing dismissively. When asked for manager, he refused to call anyone. Terrible customer experience at a heritage store.",
      assignedAgentEmail: "debashish.b@complaintos.in",
      resolution: "Park Street Store Manager personally met customer, apologized, redeemed the 4,500 reward points and credited 1,000 bonus festive points.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Staff attitude at Park Street counter was appalling during festive rush." },
        { sender: MessageSender.EMPLOYEE, text: "Mukherjee Babu, we offer our deepest apologies. Our Store Manager Shri Debashish Banerjee will personally call you." },
      ],
      comments: [
        { author: "Debashish Banerjee", text: "CCTV reviewed. Billing desk supervisor received formal written reprimand for unprofessional conduct." },
      ],
      aiSuggestion: {
        summary: "Store staff rude behavior and denial of reward point redemption during festive shopping at Park Street Kolkata.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Mr. Amitabha Mukherjee, we deeply regret the disrespectful experience you had at our Park Street store. We hold our staff to the highest standard of courteous service.",
        suggestedNextSteps: ["Counsel store staff on customer de-escalation", "Credit bonus loyalty points as goodwill"],
        confidence: 0.89,
      },
    },
    {
      custIdx: 6, // Kavitha Sundaram
      categoryCode: "DELIVERY_DELAY",
      channelCode: "WHATSAPP",
      storeCode: "BLR-IND",
      regionCode: "SOUTH",
      priority: "CRITICAL",
      status: ComplaintStatus.ASSIGNED,
      slaStatus: SlaStatus.ON_TRACK,
      subject: "Prescription Diabetes Medicine Package Missing in Express Delivery Order #MED-CHN-9021",
      description: "Ordered urgent monthly maintenance medicines for my 74-year-old father including Glycomet-GP 2 and Telma-AM 40. The express courier bag arrived sealed but only contained the multivitamin strip; the diabetes and BP medicines were missing. Need immediate redelivery as father's morning doses are interrupted.",
      assignedAgentEmail: "suresh.r@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Please expedite this urgently, my father needs his morning medication doses." },
        { sender: MessageSender.EMPLOYEE, text: "Madam, our South zone logistics manager is personally dispatching an emergency pharmacy runner from the nearest hub right now." },
      ],
      comments: [
        { author: "Suresh Ramakrishnan", text: "Emergency pharmacy runner dispatched from Indiranagar hub via Dunzo B2B with sealed cold-pack." },
      ],
      aiSuggestion: {
        summary: "Critical missing prescription medicine package for elderly patient requiring immediate emergency redelivery.",
        suggestedPriority: "CRITICAL",
        suggestedResponse: "Dear Kavitha Sundaram, we are treating this with topmost emergency priority. A direct runner has been dispatched from our Indiranagar medical hub with the missing medicines.",
        suggestedNextSteps: ["Dispatch immediate emergency medicine rider", "Audit pharmacy packing station CCTV"],
        confidence: 0.98,
      },
    },
    {
      custIdx: 7, // Harshvardhan Rathi
      categoryCode: "LOYALTY_OFFERS",
      channelCode: "X",
      storeCode: "DEL-SCK",
      regionCode: "NORTH",
      priority: "LOW",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      subject: "Promo Coupon 'DIWALI2000' Deducted Loyalty Points without Applying 20% Cart Discount",
      description: "During checkout on the mobile app for cart value Rs. 9,999, applied coupon DIWALI2000. The checkout screen showed coupon valid and deducted 2,000 points from my balance, but payment gateway Razorpay charged the un-discounted sum of Rs. 9,999. Please restore points and refund the promotional discount difference.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      resolution: "Applied Rs. 2,000 discount refund to original Axis Bank credit card and restored 2,000 points balance.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Tweeted @ComplaintOS: Coupon DIWALI2000 debited points without applying cart discount. Order #ORD-99120." },
        { sender: MessageSender.EMPLOYEE, text: "Hi Harshvardhan! We have identified the promo checkout race condition and issued Rs. 2,000 direct card credit." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Mobile app promo engine sync bug resolved by tech team. Refund processed via Razorpay API." },
      ],
      aiSuggestion: {
        summary: "Checkout discount code failed to apply discount while incorrectly burning loyalty points.",
        suggestedPriority: "LOW",
        suggestedResponse: "Dear Harshvardhan Rathi, the promotional checkout anomaly has been resolved. We have restored your 2,000 points and credited Rs. 2,000 to your card.",
        suggestedNextSteps: ["Process Razorpay refund for differential amount", "Restore customer loyalty wallet balance"],
        confidence: 0.92,
      },
    },
    {
      custIdx: 8, // Sunita Agarwal
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "WEBSITE",
      storeCode: "GUR-AMB",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      subject: "Defective LG Smart LED 55-inch TV Delivered with Cracked Screen from Ambience Mall Store",
      description: "Bought LG 55-inch 4K UHD Smart TV (Model: 55UR7500PSC) for Rs. 44,990 from Ambience Mall Gurugram store on 20th Sept (Bill #AMB-LG-7719). Delivery team unboxed the TV yesterday and found internal matrix glass shattered behind the bezel. Delivery team refused to accept responsibility saying 'installation team will note it'. Now store is asking me to contact LG directly.",
      assignedAgentEmail: "ananya.verma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "The TV was delivered with a broken display panel. Store manager is dodging responsibility." },
        { sender: MessageSender.EMPLOYEE, text: "Mrs. Agarwal, please do not worry. As an authorized premier retailer, we take 100% transit damage liability. A brand new sealed replacement unit is on the way." },
      ],
      comments: [
        { author: "Ananya Verma", text: "Ambience Mall dispatch team damaged unit during transit. Replacement unit approved from Gurugram central warehouse." },
      ],
      aiSuggestion: {
        summary: "High-value consumer electronic (55-inch Smart TV) delivered with cracked internal display panel; store attempted to redirect to OEM.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Mrs. Sunita Agarwal, we deeply apologize for the transit damage. You do not need to contact LG—we are delivering a brand new replacement unit directly from our warehouse today along with senior installation engineers.",
        suggestedNextSteps: ["Dispatch replacement unit with dual-engineer team", "Initiate logistics transit insurance claim for damaged unit"],
        confidence: 0.95,
      },
    },
    {
      custIdx: 9, // Mohammed Tariq
      categoryCode: "PAYMENT_UPI",
      channelCode: "YOUTUBE",
      storeCode: "HYD-HIC",
      regionCode: "SOUTH",
      priority: "MEDIUM",
      status: ComplaintStatus.NEW,
      slaStatus: SlaStatus.ON_TRACK,
      subject: "PhonePe QR Payment of Rs. 1,890 Deducted Twice at Inorbit Mall Cyberabad Food Court & Store Counter",
      description: "Commented on official YouTube channel: Visited Inorbit Mall store in Hyderabad yesterday. Scanned QR code at counter #2 for Rs. 1,890. PhonePe showed successful (Txn ID: T2409221948190), but cashier said soundbox did not speak payment announcement and made me pay again through debit card. Kindly refund one transaction.",
      assignedAgentEmail: "suresh.r@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Left comment on YouTube channel video regarding duplicate payment at Inorbit Mall Hyderabad." },
      ],
      comments: [],
      aiSuggestion: {
        summary: "Customer paid twice due to Paytm/PhonePe soundbox audio announcement delay at Hyderabad store counter.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Mohammed Tariq, thank you for reaching out. We have traced the Soundbox audio lag incident at Inorbit Mall counter #2 and have approved your Rs. 1,890 refund.",
        suggestedNextSteps: ["Reconcile Paytm/PhonePe merchant dashboard", "Issue refund to customer VPA"],
        confidence: 0.90,
      },
    },
    {
      custIdx: 10, // Pooja Hegde
      categoryCode: "BILLING_MRP",
      channelCode: "WEBSITE",
      storeCode: "BLR-IND",
      regionCode: "SOUTH",
      priority: "MEDIUM",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      subject: "Buy 1 Get 1 Free Offer on Organic India Green Tea Not Applied on Final Bill at Indiranagar Store",
      description: "Store had prominent shelf banners for 'Buy 1 Get 1 Free on all Organic India Tulsi Green Tea 100g Tins'. I picked 4 tins (MRP Rs. 280 each, expected total Rs. 560). On checking the bill printout at home, I noticed I was billed for all 4 tins totaling Rs. 1,120 without the promotional BOGO discount.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      resolution: "Verified store promotional shelf tag. Refunded excess Rs. 560 via UPI to customer's linked mobile number.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "BOGO offer was not discounted on bill #BLR-IND-44910. Attached photo of shelf offer banner." },
        { sender: MessageSender.EMPLOYEE, text: "Hello Pooja, thank you for sharing the photo. The BOGO barcode rule had expired in the POS system by mistake. We have credited Rs. 560 back to your UPI ID." },
      ],
      comments: [
        { author: "Kavita Reddy", text: "Store POS pricing matrix updated with active BOGO promotion." },
      ],
      aiSuggestion: {
        summary: "Promotional shelf offer (BOGO) failed to trigger on POS register billing.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Pooja Hegde, we apologize for the promotional calculation error. We have refunded the differential Rs. 560 to your UPI account.",
        suggestedNextSteps: ["Fix POS promotion barcode mapping", "Audit all shelf promotional tags at Indiranagar"],
        confidence: 0.93,
      },
    },
    {
      custIdx: 11, // Manpreet Kaur
      categoryCode: "DELIVERY_DELAY",
      channelCode: "STORE_DESK",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "LOW",
      status: ComplaintStatus.CLOSED,
      slaStatus: SlaStatus.MET,
      subject: "Home Delivery of Sleepwell Ortho Mattress Delayed by 4 Days (Order #MTR-CHD-391)",
      description: "Purchased a Queen Size Sleepwell Orthopedic Mattress with guaranteed 48-hour delivery commitment. Delivery arrived on the 6th day without prior communication from the logistics dispatch hub.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      resolution: "Customer accepted delivery. Provided complimentary mattress protector and 2 memory foam pillows as apology gesture.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Mattress finally delivered today. Delivery team was polite." },
        { sender: MessageSender.EMPLOYEE, text: "Thank you for your patience Manpreet ji. We have sent the complimentary memory foam pillows as promised." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Customer satisfied with complimentary bedding gift. Ticket closed." },
      ],
      aiSuggestion: {
        summary: "Bulky furniture delivery delay compensated with goodwill merchandise.",
        suggestedPriority: "LOW",
        suggestedResponse: "Dear Manpreet Kaur, thank you for confirming delivery. We appreciate your patience and hope you enjoy the complimentary sleep accessories.",
        suggestedNextSteps: ["Close ticket with customer satisfaction rating 5/5"],
        confidence: 0.87,
      },
    },
  ];

  // Insert complaints, history, SLA, AI suggestions, and conversation messages
  let seqCounter = 1;
  for (const c of complaintsData) {
    const cust = customerProfiles[c.custIdx];
    const complaintNumber = `CMP-${currentYear}-${String(seqCounter).padStart(6, "0")}`;
    seqCounter++;

    const category = categories[c.categoryCode];
    const channel = channels[c.channelCode];
    const store = stores[c.storeCode];
    const region = regions[c.regionCode];
    const assignedAgent = staffUsers[c.assignedAgentEmail];

    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        companyId: company.id,
        customerId: cust.id,
        channelId: channel.id,
        categoryId: category.id,
        storeId: store?.id ?? null,
        regionId: region.id,
        priority: c.priority,
        status: c.status,
        slaStatus: c.slaStatus,
        subject: c.subject,
        description: c.description,
        assignedAgentId: assignedAgent?.id ?? null,
        firstResponseAt: c.conversation.length > 1 ? new Date(Date.now() - 3600000 * 4) : null,
        resolvedAt: c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED ? new Date(Date.now() - 3600000) : null,
        closedAt: c.status === ComplaintStatus.CLOSED ? new Date() : null,
        resolution: (c as { resolution?: string }).resolution ?? null,
        slaDueAt: new Date(Date.now() + 3600000 * 20),
      },
    });

    // History record
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        changedById: assignedAgent?.id ?? null,
        actionType: "CREATION",
        previousStatus: null,
        newStatus: c.status,
        previousPriority: null,
        newPriority: c.priority,
        notes: `Complaint logged via ${channel.name}`,
      },
    });

    // SLA record
    await prisma.sLARecord.create({
      data: {
        complaintId: complaint.id,
        slaPolicyId: slaPolicy.id,
        responseDueAt: new Date(Date.now() + 3600000),
        resolutionDueAt: new Date(Date.now() + 3600000 * 24),
        firstRespondedAt: c.conversation.length > 1 ? new Date(Date.now() - 3600000 * 4) : null,
        resolvedAt: c.status === ComplaintStatus.RESOLVED ? new Date() : null,
        responseBreached: c.slaStatus === SlaStatus.BREACHED,
        resolutionBreached: c.slaStatus === SlaStatus.BREACHED,
      },
    });

    // Comments
    for (const comm of c.comments) {
      const author = staffMembers.find((s) => s.name === comm.author);
      const authorUser = author ? staffUsers[author.email] : null;
      await prisma.complaintComment.create({
        data: {
          complaintId: complaint.id,
          authorId: authorUser?.id ?? null,
          authorName: comm.author,
          comment: comm.text,
          visibility: CommentVisibility.INTERNAL,
        },
      });
    }

    // AI Analysis
    if (c.aiSuggestion) {
      await prisma.aIAnalysis.create({
        data: {
          complaintId: complaint.id,
          provider: "OPENAI",
          suggestedCategoryId: category.id,
          suggestedPriority: c.aiSuggestion.suggestedPriority,
          summary: c.aiSuggestion.summary,
          suggestedResponse: c.aiSuggestion.suggestedResponse,
          suggestedNextSteps: c.aiSuggestion.suggestedNextSteps,
          similarComplaintIds: [],
          confidence: c.aiSuggestion.confidence,
          status: "SUGGESTED",
        },
      });
    }

    // Conversation & Messages
    if (c.conversation.length > 0) {
      const conv = await prisma.conversation.create({
        data: {
          complaintId: complaint.id,
          companyId: company.id,
        },
      });

      for (const msg of c.conversation) {
        await prisma.conversationMessage.create({
          data: {
            conversationId: conv.id,
            companyId: company.id,
            senderType: msg.sender,
            authorId: msg.sender === MessageSender.CUSTOMER ? cust.userId : assignedAgent?.id,
            authorName: msg.sender === MessageSender.CUSTOMER ? cust.name : (assignedAgent?.name ?? "Support Agent"),
            body: msg.text,
            channelCode: c.channelCode,
            deliveryStatus: MessageDeliveryStatus.SENT,
          },
        });
      }
    }
  }

  // Update complaint sequence
  await prisma.complaintSequence.update({
    where: { year: currentYear },
    data: { lastNumber: seqCounter - 1 },
  });

  // Update system classification
  await prisma.systemSetting.upsert({
    where: { key: "data.classification" },
    update: { value: "PRODUCTION LIVE (INDIA RETAIL)" },
    create: { key: "data.classification", value: "PRODUCTION LIVE (INDIA RETAIL)" },
  });

  console.log("🇮🇳 Seeding Completed Successfully!");
  console.log(`- Created ${staffMembers.length} Staff/Admin users with authentic Indian profiles`);
  console.log(`- Created ${customerProfiles.length} Indian customer profiles (Mumbai, Bengaluru, Delhi NCR, Kolkata, Chennai, etc.)`);
  console.log(`- Created ${complaintsData.length} Realistic Indian retail complaints (UPI, MRP overcharging, Atta quality, Havells geyser, etc.)`);
  console.log("Demo logins (password for all: DemoPass123!):");
  console.log("  Super Admin: admin@example.com (Vikramaditya Singhania)");
  console.log("  Manager:     manager@example.com (Pooja Iyer)");
  console.log("  Agent:       agent@example.com (Rohan Kulkarni)");
  console.log("  Customer:    customer@example.com (Aarav Mehta)");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
