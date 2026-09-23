import { PrismaClient, RoleCode, ComplaintStatus, SlaStatus, CommentVisibility, MessageSender, MessageDeliveryStatus, EscalationStatus, EscalationType } from "@prisma/client";
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
      regionCode: undefined, // National Operations Manager
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
      name: "Debashis Roy",
      email: "debashis.roy@complaintos.in",
      phone: "+91 98300 00008",
      roleCode: RoleCode.REGIONAL_MANAGER,
      regionCode: "EAST",
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
      name: "Kavita Reddy",
      email: "kavita.reddy@complaintos.in",
      phone: "+91 98490 00009",
      roleCode: RoleCode.AGENT,
      regionCode: "SOUTH",
      storeCode: "BLR-IND",
    },
    {
      name: "Amit Das",
      email: "amit.das@complaintos.in",
      phone: "+91 98310 00010",
      roleCode: RoleCode.AGENT,
      regionCode: "EAST",
      storeCode: "KOL-PKS",
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
    { name: "Aarav Mehta", email: "customer@example.com", phone: "+91 98201 55432", city: "Mumbai", regionCode: "WEST", prefContact: "WHATSAPP" },
    { name: "Rajesh Kumar Sharma", email: "rajesh.sharma82@gmail.com", phone: "+91 98201 44812", city: "Mumbai", regionCode: "WEST", prefContact: "PHONE" },
    { name: "Sneha Deshmukh", email: "sneha.deshmukh@yahoo.co.in", phone: "+91 98450 19283", city: "Bengaluru", regionCode: "SOUTH", prefContact: "EMAIL" },
    { name: "Vikramaditya Joshi", email: "vikram.joshi@outlook.com", phone: "+91 99102 78394", city: "New Delhi", regionCode: "NORTH", prefContact: "WHATSAPP" },
    { name: "Deepika Patel", email: "deepika.patel@gmail.com", phone: "+91 97274 56120", city: "Ahmedabad", regionCode: "WEST", prefContact: "EMAIL" },
    { name: "Amitabha Mukherjee", email: "amitabha.m@rediffmail.com", phone: "+91 98301 92834", city: "Kolkata", regionCode: "EAST", prefContact: "PHONE" },
    { name: "Kavitha Sundaram", email: "kavitha.sundaram@gmail.com", phone: "+91 94440 81923", city: "Chennai", regionCode: "SOUTH", prefContact: "EMAIL" },
    { name: "Harshvardhan Rathi", email: "harsh.rathi@gmail.com", phone: "+91 98290 33419", city: "Jaipur", regionCode: "NORTH", prefContact: "WHATSAPP" },
    { name: "Sunita Agarwal", email: "sunita.agarwal99@gmail.com", phone: "+91 98112 40591", city: "Gurugram", regionCode: "NORTH", prefContact: "EMAIL" },
    { name: "Mohammed Tariq", email: "tariq.md89@gmail.com", phone: "+91 98490 29384", city: "Hyderabad", regionCode: "SOUTH", prefContact: "PHONE" },
    { name: "Pooja Hegde", email: "pooja.hegde@gmail.com", phone: "+91 99001 82736", city: "Bengaluru", regionCode: "SOUTH", prefContact: "WHATSAPP" },
    { name: "Manpreet Kaur", email: "manpreet.k88@gmail.com", phone: "+91 98140 55219", city: "Chandigarh", regionCode: "NORTH", prefContact: "EMAIL" },
    { name: "Siddharth Roy", email: "sid.roy@gmail.com", phone: "+91 98310 66291", city: "Kolkata", regionCode: "EAST", prefContact: "EMAIL" },
    { name: "Ritu Mathur", email: "ritu.mathur@yahoo.com", phone: "+91 98260 74829", city: "Pune", regionCode: "WEST", prefContact: "WHATSAPP" },
    { name: "Gaurav Bhatia", email: "gaurav.bhatia@gmail.com", phone: "+91 98100 99281", city: "Noida", regionCode: "NORTH", prefContact: "PHONE" },
    { name: "Meenakshi Swaminathan", email: "meenakshi.s@gmail.com", phone: "+91 94451 22390", city: "Chennai", regionCode: "SOUTH", prefContact: "EMAIL" },
    { name: "Tanvi Kulkarni", email: "tanvi.kulkarni@gmail.com", phone: "+91 98230 44910", city: "Pune", regionCode: "WEST", prefContact: "WHATSAPP" },
    { name: "Rahul Verma", email: "rahul.verma@gmail.com", phone: "+91 99110 33481", city: "New Delhi", regionCode: "NORTH", prefContact: "EMAIL" },
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

  const now = new Date();
  const msHour = 3600000;

  // 10. Comprehensive Indian Retail Complaints Dataset
  const complaintsData = [
    // --- ESCALATED GRIEVANCES (High impact, assigned to Operations / Regional leadership) ---
    {
      custIdx: 1, // Rajesh Kumar Sharma
      categoryCode: "BILLING_MRP",
      channelCode: "WEBSITE",
      storeCode: "MUM-BND",
      regionCode: "WEST",
      priority: "CRITICAL",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 14),
      slaDueAt: new Date(now.getTime() + msHour * 2),
      subject: "Overcharged Rs. 85 above printed MRP on Amul Cow Ghee 1L Tin at Bandra West Outlet",
      description: "Visited the Bandra Linking Road outlet on Sunday afternoon. Purchased Amul Pure Cow Ghee 1L Tin (Batch No: AG-204). The printed MRP on the package was clearly Rs. 650 incl. of all taxes, but the cashier billed it at Rs. 735 under barcode 8901262010150. When pointed out, the cashier argued that new stock rates have increased and refused to adjust the bill. This violates Legal Metrology Rules 2011.",
      assignedAgentEmail: "aditya.patel@complaintos.in",
      escalationReason: "Legal Metrology MRP compliance violation; cashier refused on-spot rectification.",
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
      custIdx: 13, // Ritu Mathur
      categoryCode: "PAYMENT_UPI",
      channelCode: "STORE_DESK",
      storeCode: "PUN-VIM",
      regionCode: "WEST",
      priority: "CRITICAL",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 18),
      slaDueAt: new Date(now.getTime() + msHour * 3),
      subject: "Double Debit of Rs. 18,499 for Samsung 43-inch Smart TV on POS Card Terminal #2",
      description: "During festive electronics purchase at Phoenix Marketcity Pune, card was swiped twice due to terminal paper roll jam. Both transactions debited from ICICI Bank credit card (Auth codes: 881920 & 881921). Store accounts has not credited back after 48 hours.",
      assignedAgentEmail: "agent@example.com",
      escalationReason: "High value double debit on POS terminal requiring immediate bank nodal escalation.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Rs. 18,499 was debited twice on my ICICI card. Bank statement copy attached." },
        { sender: MessageSender.EMPLOYEE, text: "Ma'am we have marked this as critical escalation with PineLabs merchant desk." },
      ],
      comments: [
        { author: "Pooja Iyer", text: "Banking reconciliation initiated. Direct chargeback avoidance approval granted for immediate customer refund." },
      ],
      aiSuggestion: {
        summary: "Double charge of Rs. 18,499 at Pune outlet due to EDC paper jam. High financial escalation.",
        suggestedPriority: "CRITICAL",
        suggestedResponse: "Dear Ritu Mathur, we have verified the duplicate settlement batch with ICICI Bank and initiated the immediate reversal of Rs. 18,499.",
        suggestedNextSteps: ["Execute immediate ERP reversal credit", "Issue POS batch audit at Pune outlet"],
        confidence: 0.98,
      },
    },
    {
      custIdx: 9, // Mohammed Tariq
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "GOOGLE_REVIEW",
      storeCode: "HYD-HIC",
      regionCode: "SOUTH",
      priority: "CRITICAL",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 6),
      slaDueAt: new Date(now.getTime() + msHour * 18),
      subject: "FSSAI Safety Alert: Mould Infestation in Vacuum Sealed Organic Paneer 500g (Batch PN-992)",
      description: "Purchased 2 packets of organic Malai Paneer from Inorbit Mall Cyberabad yesterday evening. Packaging was sealed but interior had greenish fungal growth upon opening. Family member consumed a small bite. Demanding immediate batch recall from shelves across Hyderabad.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      escalationReason: "Food safety health hazard requiring QA batch quarantine across South region stores.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "This is a serious health hazard. Green mould inside sealed paneer pack. Photos uploaded." },
        { sender: MessageSender.EMPLOYEE, text: "Mr. Tariq, we are dispatching our quality inspector and regional QA head to your location immediately." },
      ],
      comments: [
        { author: "Pooja Iyer", text: "Cold chain audit ordered for South Zone dairy distributors. Batch PN-992 delisted from billing system nationwide." },
      ],
      aiSuggestion: {
        summary: "Perishable food spoilage complaint with food safety risk at Inorbit Mall Hyderabad.",
        suggestedPriority: "CRITICAL",
        suggestedResponse: "Dear Mohammed Tariq, customer safety is our utmost priority. We have locked Batch PN-992 across all stores and sent our food safety team to inspect cold storage integrity.",
        suggestedNextSteps: ["Immediate cold chain temperature logs verification", "Quarantine vendor supply line", "Executive customer visit"],
        confidence: 0.97,
      },
    },
    {
      custIdx: 8, // Sunita Agarwal
      categoryCode: "STAFF_BEHAVIOUR",
      channelCode: "X",
      storeCode: "GUR-AMB",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 20),
      slaDueAt: new Date(now.getTime() + msHour * 1),
      subject: "Aggressive Refusal of Legitimate Apparel Exchange by Floor Supervisor at Ambience Mall",
      description: "Visited Ambience Mall Gurugram with unworn formal blazer having original tags and invoice #INV-GUR-40192 for size change within the 14-day policy. Floor supervisor Mr. Pankaj misbehaved, spoke rudely in front of other shoppers, and tore the return slip.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      escalationReason: "Public viral escalation on X regarding staff misconduct and policy violation.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "I have tweeted the video of the store manager yelling at customers. Please resolve this exchange immediately." },
        { sender: MessageSender.EMPLOYEE, text: "Dear Sunita ji, we sincerely apologize. North regional operations head is reviewing the CCTV footage right now." },
      ],
      comments: [
        { author: "Pooja Iyer", text: "Floor supervisor placed under disciplinary review. Customer invited for VIP doorstep exchange." },
      ],
      aiSuggestion: {
        summary: "Store staff hostility and exchange refusal at Gurugram Ambience store escalated on social media.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Sunita Agarwal, we hold our retail ambassadors to the highest standards of hospitality. We are arranging a doorstep exchange with a complimentary gift voucher.",
        suggestedNextSteps: ["Review CCTV audio logs", "Issue formal apology", "Staff behavioral coaching"],
        confidence: 0.93,
      },
    },
    {
      custIdx: 12, // Siddharth Roy
      categoryCode: "DELIVERY_DELAY",
      channelCode: "WEBSITE",
      storeCode: "KOL-SCT",
      regionCode: "EAST",
      priority: "HIGH",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 22),
      slaDueAt: new Date(now.getTime() + msHour * 2),
      subject: "Damaged Transit Delivery of Sony Bravia 55-inch OLED with Smashed Display Panel",
      description: "High-value TV delivery received via express logistics partner in Kolkata. Box was wet on corners and upon unboxing by logistics driver, the glass panel was completely cracked. Driver refused to take the box back without supervisor authorization.",
      assignedAgentEmail: "amit.das@complaintos.in",
      escalationReason: "High-value transit damage dispute between logistics vendor and warehouse dispatch hub.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Delivery unboxing video attached showing completely shattered screen upon opening." },
        { sender: MessageSender.EMPLOYEE, text: "Mr. Roy, replacement unit dispatch is being prioritized from our Dankuni central warehouse." },
      ],
      comments: [
        { author: "Debashis Roy", text: "Escalated to 3PL logistics partner for full transit insurance claim. Priority replacement unit dispatched." },
      ],
      aiSuggestion: {
        summary: "Fragile electronic transit damage on Rs. 1,12,000 OLED TV delivery in South Kolkata.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Siddharth Roy, we regret the transit mishandling. A brand-new replacement unit has been dispatched directly from our regional hub with dedicated installation staff.",
        suggestedNextSteps: ["Transit damage survey claim", "Dispatch replacement within 12 hours"],
        confidence: 0.95,
      },
    },
    {
      custIdx: 15, // Meenakshi Swaminathan
      categoryCode: "WARRANTY_SERVICE",
      channelCode: "WHATSAPP",
      storeCode: "BLR-IND",
      regionCode: "SOUTH",
      priority: "CRITICAL",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 5),
      slaDueAt: new Date(now.getTime() + msHour * 19),
      subject: "IFB Front Load Washing Machine Motor Failure Under 4-Year Super Warranty - Repair Refused",
      description: "Purchased IFB 8kg Executive Plus washing machine from Indiranagar store. Motor stalled after 11 months. Service technician demanded Rs. 3,800 for motor PCB replacement claiming water hardness voided warranty, which is contrary to warranty booklet terms.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      escalationReason: "Brand warranty dispute with unauthorized repair charge demand on consumer.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Warranty card clearly states 4-year zero cost motor replacement. Technician refuses to repair without cash." },
        { sender: MessageSender.EMPLOYEE, text: "We have contacted IFB South Regional Service Head directly to override this illegitimate charge." },
      ],
      comments: [
        { author: "Pooja Iyer", text: "Authorized brand repair escalated. Zero-charge replacement confirmed by manufacturer territory manager." },
      ],
      aiSuggestion: {
        summary: "Customer charged for in-warranty motor replacement by third-party technician in Bengaluru.",
        suggestedPriority: "CRITICAL",
        suggestedResponse: "Dear Meenakshi, we have spoken with IFB leadership. The motor PCB replacement is 100% free of charge and scheduled for tomorrow.",
        suggestedNextSteps: ["Direct escalation to brand OEM manager", "Schedule senior technician visit"],
        confidence: 0.94,
      },
    },

    // --- OVERDUE & SLA BREACHED GRIEVANCES ---
    {
      custIdx: 3, // Vikramaditya Joshi
      categoryCode: "WARRANTY_SERVICE",
      channelCode: "EMAIL",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.OVERDUE,
      createdAt: new Date(now.getTime() - msHour * 52),
      slaDueAt: new Date(now.getTime() - msHour * 28),
      subject: "Havells 25L Storage Geyser Installation Pending for 6 Days - Repeated Technician No-Show",
      description: "Purchased Havells Monza EC 25L Water Geyser from Connaught Place outlet on 18th Sept. Store promised authorized installation within 24 hours. Service request #HVL-DEL-8819 was generated, but technician has postponed 4 times giving excuses of traffic and parts unavailability. SLA is heavily breached.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Day 6 now and geyser is still lying unpacked on bathroom floor. Please refund or install immediately." },
        { sender: MessageSender.EMPLOYEE, text: "Mr. Joshi, we are deeply apologetic for this gross SLA breach. We are penalizing the installation agency." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Technician vendor fined Rs. 1,000 for repeated SLA violations. Internal escalation raised." },
      ],
      aiSuggestion: {
        summary: "Geyser installation overdue by 48+ hours past agreed SLA timeline.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Mr. Joshi, we sincerely apologize for the delay. We have assigned our senior-most installation engineer with a fixed slot today at 4:00 PM.",
        suggestedNextSteps: ["Immediate technician dispatch", "Credit delay compensation voucher"],
        confidence: 0.92,
      },
    },
    {
      custIdx: 5, // Amitabha Mukherjee
      categoryCode: "RETURN_REFUND",
      channelCode: "WEBSITE",
      storeCode: "KOL-PKS",
      regionCode: "EAST",
      priority: "MEDIUM",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.OVERDUE,
      createdAt: new Date(now.getTime() - msHour * 60),
      slaDueAt: new Date(now.getTime() - msHour * 36),
      subject: "Refund of Rs. 3,499 Not Credited After Successful Reverse Pickup on 19th September",
      description: "Returned defective Philips Air Fryer at Park Street counter on 19th Sept (Pickup Ref #RET-KOL-1102). Acknowledgment receipt was given with 48-hour refund promise. Money not credited to SBI bank account despite passing 5 days.",
      assignedAgentEmail: "amit.das@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Reverse pickup was completed on Saturday. Why is refund not credited yet?" },
        { sender: MessageSender.EMPLOYEE, text: "Sir, checking with our treasury gateway why the NEFT batch failed to trigger." },
      ],
      comments: [
        { author: "Amit Das", text: "Gateway retry queued. Bank IFSC code mismatch in customer profile corrected." },
      ],
      aiSuggestion: {
        summary: "Reverse pickup refund SLA breached by 36 hours due to banking payout queue error.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Amitabha Mukherjee, your refund of Rs. 3,499 has been re-triggered manually via IMPS and will credit within 2 hours.",
        suggestedNextSteps: ["Verify IMPS payout UTR", "Send SMS confirmation"],
        confidence: 0.89,
      },
    },
    {
      custIdx: 14, // Gaurav Bhatia
      categoryCode: "DELIVERY_DELAY",
      channelCode: "WHATSAPP",
      storeCode: "DEL-SCK",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.OVERDUE,
      createdAt: new Date(now.getTime() - msHour * 48),
      slaDueAt: new Date(now.getTime() - msHour * 24),
      subject: "Guaranteed 2-Hour Quick Grocery Delivery Missing 4 Premium Imported Cheese Items (Order #DEL-9921)",
      description: "Ordered imported gouda, parmesan wedges, and olive oil for a dinner party from Saket Citywalk store under 2-hour guarantee. Rider arrived 5 hours late and 4 dairy items were completely missing from the sealed bag. Customer care chatbot closed ticket automatically.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Party was ruined because items never arrived. Chatbot was useless." },
        { sender: MessageSender.EMPLOYEE, text: "Mr. Bhatia, we are refunding the missing items immediately along with full delivery fee reversal." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Dark store packer logged as missing item negligence. Full refund processed." },
      ],
      aiSuggestion: {
        summary: "Quick commerce order delivery delay and incomplete package dispatch in South Delhi.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Gaurav Bhatia, we deeply regret this breakdown in service. We have refunded the entire cart value of the missing items along with compensation.",
        suggestedNextSteps: ["Instant wallet refund", "Audit Saket dispatch bay"],
        confidence: 0.91,
      },
    },
    {
      custIdx: 16, // Tanvi Kulkarni
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "STORE_DESK",
      storeCode: "PUN-VIM",
      regionCode: "WEST",
      priority: "MEDIUM",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.BREACHED,
      createdAt: new Date(now.getTime() - msHour * 72),
      slaDueAt: new Date(now.getTime() - msHour * 48),
      subject: "Defective boAt Airdopes 441 TWS Earbuds - Store Counter Denied Replacement Within 7 Days",
      description: "Purchased boAt earbuds from Viman Nagar store on 16th Sept. Left earbud stopped charging after 2 days. Returned to store within 7-day DOA policy. Store executive refused replacement asking me to travel to third-party service center in Camp.",
      assignedAgentEmail: "agent@example.com",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Invoice date 16th Sept, returned on 18th Sept. Store staff violated your 7-day instant replacement promise." },
        { sender: MessageSender.EMPLOYEE, text: "Tanvi, this was wrong on our store's part. We are replacing the unit immediately." },
      ],
      comments: [
        { author: "Rohan Kulkarni", text: "Store staff re-trained on 7-day brand replacement SOP. New sealed box prepared for customer pickup." },
      ],
      aiSuggestion: {
        summary: "7-day dead-on-arrival replacement denied incorrectly by Pune outlet floor staff.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Tanvi, we apologize for the miscommunication. A brand new replacement box is waiting for you at the customer service desk.",
        suggestedNextSteps: ["Prepare replacement unit", "Issue store apology voucher"],
        confidence: 0.94,
      },
    },

    // --- APPROACHING SLA BREACH GRIEVANCES (Due in 30-90 minutes) ---
    {
      custIdx: 10, // Pooja Hegde
      categoryCode: "BILLING_MRP",
      channelCode: "WEBSITE",
      storeCode: "BLR-KOR",
      regionCode: "SOUTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 22),
      slaDueAt: new Date(now.getTime() + msHour * 1.5),
      subject: "Buy-1-Get-1 Barcode Discount Not Computed at Koramangala POS Terminal for Dabur Honey 500g",
      description: "Store had prominent Buy 1 Get 1 Free banners on Dabur Organic Honey 500g. At the billing counter, cashier scanned both jars at full price (Rs. 560 x 2 = Rs. 1,120). When questioned, cashier said discount applies only on app orders.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Photo of store shelf banner attached clearly showing store BOGO offer." },
        { sender: MessageSender.EMPLOYEE, text: "Hello Pooja, verifying the promotional scheme code with regional merchandising." },
      ],
      comments: [
        { author: "Kavita Reddy", text: "Promotional master sync bug confirmed. Refund of Rs. 560 approved." },
      ],
      aiSuggestion: {
        summary: "Store shelf promotional pricing discrepancy at Nexus Mall Koramangala.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Pooja Hegde, we apologize for the POS sync error. The differential Rs. 560 has been refunded to your original payment method.",
        suggestedNextSteps: ["Sync POS promotion table", "Credit refund via UPI"],
        confidence: 0.93,
      },
    },
    {
      custIdx: 17, // Rahul Verma
      categoryCode: "LOYALTY_OFFERS",
      channelCode: "WHATSAPP",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "MEDIUM",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 23),
      slaDueAt: new Date(now.getTime() + msHour * 1),
      subject: "Festive Cashback of 2,500 Reward Points Not Credited on Gold Membership Purchase of Rs. 24,000",
      description: "Made high-value apparel purchase during Diwali preview sale at CP store. Sales executive assured instant 10% loyalty points credit on phone number #99110 33481. No points have reflected in app account after 24 hours.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "My loyalty tier is Platinum. Where is the 2,500 points credit for invoice #DEL-CP-99120?" },
        { sender: MessageSender.EMPLOYEE, text: "Rahul ji, checking with our CRM team to push the loyalty ledger entry." },
      ],
      comments: [
        { author: "Neha Sharma", text: "CRM webhook failed during peak billing hours. Manual points push requested." },
      ],
      aiSuggestion: {
        summary: "Loyalty point credit missing on high-value retail invoice in New Delhi.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Rahul Verma, we have credited 2,500 bonus points along with 500 compensatory points to your membership wallet.",
        suggestedNextSteps: ["Trigger manual CRM points addition", "Send SMS confirmation"],
        confidence: 0.91,
      },
    },

    // --- ACTIVE IN-PROGRESS & CATEGORISED GRIEVANCES ---
    {
      custIdx: 0, // Aarav Mehta
      categoryCode: "PAYMENT_UPI",
      channelCode: "WHATSAPP",
      storeCode: "MUM-PHX",
      regionCode: "WEST",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 4),
      slaDueAt: new Date(now.getTime() + msHour * 20),
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
      custIdx: 4, // Deepika Patel
      categoryCode: "PAYMENT_UPI",
      channelCode: "WEBSITE",
      storeCode: "MUM-PHX",
      regionCode: "WEST",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 7),
      slaDueAt: new Date(now.getTime() + msHour * 17),
      subject: "PayTM UPI QR Scan Failed at Checkout but Bank Account Debited Rs. 2,190 (UTR: 991820194821)",
      description: "Scanned dynamic UPI QR at store counter. Amount debited immediately from Axis Bank, but billing POS did not generate receipt.",
      assignedAgentEmail: "aditya.patel@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "My bank has debited Rs. 2,190. Cashier refused to hand over items without second payment." },
        { sender: MessageSender.EMPLOYEE, text: "Deepika ji, we have pulled the settlement batch. Reversal is in progress." },
      ],
      comments: [
        { author: "Aditya Patel", text: "Payment reconciliation in progress with PayTM nodal desk." },
      ],
      aiSuggestion: {
        summary: "UPI payment debit without POS receipt generation at Mumbai store.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Deepika Patel, we have verified transaction UTR 991820194821. The refund has been triggered.",
        suggestedNextSteps: ["Confirm NPCI settlement", "Notify customer via WhatsApp"],
        confidence: 0.93,
      },
    },
    {
      custIdx: 6, // Kavitha Sundaram
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "YOUTUBE",
      storeCode: "BLR-IND",
      regionCode: "SOUTH",
      priority: "MEDIUM",
      status: ComplaintStatus.CATEGORISED,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 8),
      slaDueAt: new Date(now.getTime() + msHour * 16),
      subject: "Prestige Induction Base Cookware Coating Peeling Off After 2 Weeks of Normal Use",
      description: "Purchased Prestige 3-Piece Granite Cookware Set from 100ft Road Indiranagar store. Non-stick surface is chipping off with wooden spatulas. Toxic coating coming into food.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "YouTube comment left under new product review video. The non-stick coating is peeling in flakes." },
      ],
      comments: [
        { author: "Kavita Reddy", text: "Assigned for replacement under 2-year manufacturer non-stick coating warranty." },
      ],
      aiSuggestion: {
        summary: "Cookware non-stick surface failure reported via YouTube social listening.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Kavitha, we are arranging a direct replacement of your cookware set under warranty.",
        suggestedNextSteps: ["Collect defective item for QA analysis", "Issue brand replacement"],
        confidence: 0.88,
      },
    },
    {
      custIdx: 7, // Harshvardhan Rathi
      categoryCode: "DELIVERY_DELAY",
      channelCode: "EMAIL",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "LOW",
      status: ComplaintStatus.NEW,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 2),
      slaDueAt: new Date(now.getTime() + msHour * 22),
      subject: "Expedited Home Delivery of Puma Running Shoes Delayed by 2 Days (Track #PUM-DEL-892)",
      description: "Ordered Puma Velocity Nitro 2 running shoes with guaranteed next-day delivery for marathon training. Tracking status shows 'Stuck at Hub' for 48 hours.",
      assignedAgentEmail: null,
      conversation: [],
      comments: [],
      aiSuggestion: {
        summary: "Next-day delivery commitment delayed at North logistics sorting hub.",
        suggestedPriority: "LOW",
        suggestedResponse: "Dear Harshvardhan, we are escalating with Delhi logistics dispatch for guaranteed same-day delivery.",
        suggestedNextSteps: ["Auto-assign to North Agent", "Trigger logistics priority flag"],
        confidence: 0.90,
      },
    },

    // --- YOUTUBE CHANNEL COMMENTS (Grouped by Video IDs) ---
    {
      custIdx: 0, // Aarav Mehta
      categoryCode: "RETURN_REFUND",
      channelCode: "YOUTUBE",
      storeCode: "PUN-VIM",
      regionCode: "WEST",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 1),
      slaDueAt: new Date(now.getTime() + msHour * 23),
      subject: "YouTube: ComplaintOS Launch & Customer Grievance Workflow [videoId:dQw4w9WgXcQ] [commentId:Ugx891JLa9-1]",
      description: "Watched your video review and placed an order for the smart air purifier. The return policy in this video claims '14-day hassle-free doorstep return', but the courier partner in Pune Viman Nagar refused to accept the open-box return today!",
      assignedAgentEmail: "agent@example.com",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Left a comment on your official YouTube channel video explaining the return refusal issue." },
        { sender: MessageSender.EMPLOYEE, text: "Namaste Aarav, thank you for reaching out via YouTube. We have scheduled an immediate doorstep reverse pickup for tomorrow morning." },
      ],
      comments: [
        { author: "Rohan Kulkarni", text: "Verified YouTube comment author identity. Reverse pickup initiated with 3PL logistics." },
      ],
      aiSuggestion: {
        summary: "YouTube comment complaint regarding return refusal contrary to brand video policy.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Hello Aarav, thank you for watching our channel. We have scheduled your doorstep pickup for tomorrow.",
        suggestedNextSteps: ["Dispatch courier for pickup", "Reply to YouTube comment thread"],
        confidence: 0.95,
      },
    },
    {
      custIdx: 1, // Priya Sharma
      categoryCode: "DELIVERY_DELAY",
      channelCode: "YOUTUBE",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "MEDIUM",
      status: ComplaintStatus.NEW,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 3),
      slaDueAt: new Date(now.getTime() + msHour * 21),
      subject: "YouTube: ComplaintOS Launch & Customer Grievance Workflow [videoId:dQw4w9WgXcQ] [commentId:Ugz912KMa7-2]",
      description: "I ordered the flagship headset shown at 02:45 in this video, but the tracking number #EXP-DEL-8812 has not updated in 3 days. When will it arrive?",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [],
      comments: [],
      aiSuggestion: {
        summary: "YouTube viewer inquiry regarding delayed order dispatch featured in demo video.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Hi Priya, your parcel is currently in transit from Delhi hub and will be delivered by 5 PM today.",
        suggestedNextSteps: ["Provide live tracking link on YouTube reply"],
        confidence: 0.91,
      },
    },
    {
      custIdx: 8, // Sunita Agarwal
      categoryCode: "PAYMENT_UPI",
      channelCode: "YOUTUBE",
      storeCode: "MUM-PHX",
      regionCode: "WEST",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 2),
      slaDueAt: new Date(now.getTime() + msHour * 22),
      subject: "YouTube: Store POS & Smart Checkout Tech Tour [videoId:M7lc1UVf-VE] [commentId:Ugw773NBa8-3]",
      description: "Saw your video about the new dynamic QR POS counters at Phoenix Palladium Mumbai. Visited counter #4 today and faced a double debit of Rs. 3,499 via PhonePe. Receipt failed to print!",
      assignedAgentEmail: "agent@example.com",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Commented on your YouTube store tech tour video with my transaction UTR #391029102912." },
        { sender: MessageSender.EMPLOYEE, text: "Sunita ji, we have matched your UTR with the Mumbai terminal settlement logs. Reversal is in progress." },
      ],
      comments: [
        { author: "Rohan Kulkarni", text: "Reconciliation verified from YouTube comment escalation." },
      ],
      aiSuggestion: {
        summary: "YouTube escalation regarding POS dynamic QR double deduction at Lower Parel store.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Sunita, thank you for alerting us on YouTube. The reversal of Rs. 3,499 has been approved.",
        suggestedNextSteps: ["Confirm settlement batch", "Post reassuring comment reply on YouTube"],
        confidence: 0.96,
      },
    },
    {
      custIdx: 17, // Rahul Verma
      categoryCode: "WARRANTY_SERVICE",
      channelCode: "YOUTUBE",
      storeCode: "GUR-AMB",
      regionCode: "NORTH",
      priority: "MEDIUM",
      status: ComplaintStatus.NEW,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 4),
      slaDueAt: new Date(now.getTime() + msHour * 20),
      subject: "YouTube: Store POS & Smart Checkout Tech Tour [videoId:M7lc1UVf-VE] [commentId:Ugy661PLk5-4]",
      description: "The digital e-warranty QR code shown at 04:10 on this video gave a 404 error when I scanned it for my Dyson V12 vacuum cleaner. How do I activate the 2-year warranty?",
      assignedAgentEmail: null,
      conversation: [],
      comments: [],
      aiSuggestion: {
        summary: "QR code warranty portal activation error reported via YouTube comment.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Hello Rahul, we have manually activated your 2-year manufacturer warranty under certificate #WAR-DYS-9921.",
        suggestedNextSteps: ["Assign to North Agent", "Email warranty certificate"],
        confidence: 0.89,
      },
    },
    {
      custIdx: 10, // Pooja Hegde
      categoryCode: "STAFF_BEHAVIOUR",
      channelCode: "YOUTUBE",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 5),
      slaDueAt: new Date(now.getTime() + msHour * 19),
      subject: "YouTube: Connaught Place Flagship Store Experience [videoId:kJQP7kiw5Fk] [commentId:Ugv554MZa2-5]",
      description: "The video presents the CP store as having zero waiting time, but when I visited on Sunday, the customer service counter had only one staff member handling 35 customers and he was very discourteous.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Commented on YouTube CP flagship video highlighting extreme queue mismanagement." },
        { sender: MessageSender.EMPLOYEE, text: "Pooja ji, store management has reviewed floor staffing and deployed 3 additional executives." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Addressed via social media channel monitoring." },
      ],
      aiSuggestion: {
        summary: "YouTube comment grievance regarding store staff deficit and queue wait time in New Delhi.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Pooja Hegde, thank you for your candid feedback on our channel. We have revamped our floor staffing roster.",
        suggestedNextSteps: ["Store manager counseling", "Post resolution reply"],
        confidence: 0.93,
      },
    },

    // --- VERIFIED INBOUND EMAIL GRIEVANCES (Rich IMAP Ingestion) ---
    {
      custIdx: 3, // Vikramaditya Joshi
      categoryCode: "BILLING_MRP",
      channelCode: "EMAIL",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 1.5),
      slaDueAt: new Date(now.getTime() + msHour * 22.5),
      subject: "Fwd: Discrepancy in Invoice #INV-DEL-99210 - GST Charged Twice on Electronic Accessories [MsgId:<202609231011.88291@mail.google.com>]",
      description: "From: Vikramaditya Joshi &lt;v.joshi@outlook.in&gt;<br/>To: Grievance Officer &lt;support@complaintos.in&gt;<br/>Date: 23 Sep 2026, 10:15 AM<br/>Subject: Discrepancy in Invoice #INV-DEL-99210<br/><br/>Respected Customer Grievance Cell,<br/><br/>I am writing to bring to your urgent notice an accounting error on my bill #INV-DEL-99210 generated yesterday at the Connaught Place outlet. GST at 18% has been added once in the itemized table and once again in the subtotal summary, resulting in an excess charge of Rs. 1,240.<br/><br/>Kindly review the attached scanned invoice and process the tax differential refund to my bank account.<br/><br/>Warm regards,<br/><strong>Vikramaditya Joshi</strong><br/>Ph: +91 98101 22910",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Inbound Email received via Gmail IMAP SSL connection." },
        { sender: MessageSender.EMPLOYEE, text: "Dear Mr. Joshi, thank you for emailing our grievance desk. Our accounts supervisor has recalculated the bill and initiated a refund of Rs. 1,240." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Tax invoice recalculated with accounts team. Credit note #CN-DEL-401 generated." },
      ],
      aiSuggestion: {
        summary: "Inbound email reporting double GST line item calculation on retail tax invoice.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Vikramaditya Joshi, we have examined your tax invoice #INV-DEL-99210. The excess GST of Rs. 1,240 has been refunded to your original payment method.",
        suggestedNextSteps: ["Dispatch Credit Note PDF", "Send confirmation email to v.joshi@outlook.in"],
        confidence: 0.97,
      },
    },
    {
      custIdx: 12, // Siddharth Roy
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "EMAIL",
      storeCode: "KOL-SCT",
      regionCode: "EAST",
      priority: "CRITICAL",
      status: ComplaintStatus.ESCALATED,
      slaStatus: SlaStatus.APPROACHING,
      createdAt: new Date(now.getTime() - msHour * 18),
      slaDueAt: new Date(now.getTime() + msHour * 6),
      subject: "URGENT: Defective LG OLED 65-inch TV - Screen Bleeding & Refusal of Technician Visit [MsgId:<kolkata.roy.992@gmail.com>]",
      description: "From: Siddharth Roy &lt;siddharth.roy@tcs.com&gt;<br/>To: Escalations Desk &lt;support@complaintos.in&gt;<br/>Date: 22 Sep 2026, 06:30 PM<br/>Subject: URGENT: Defective LG OLED 65-inch TV<br/><br/>Dear Senior Management,<br/><br/>This is regarding TV serial #OLED65-KOL-8891 delivered on Monday. The panel exhibits severe backlight bleeding and vertical green lines on the right side. The local authorized LG service center in Salt Lake claims this is 'normal panel variance' and closed the call ticket.<br/><br/>I request an immediate panel replacement or 100% money-back refund under your 30-day premium guarantee.<br/><br/>Sincerely,<br/><strong>Siddharth Roy</strong>",
      assignedAgentEmail: "amit.das@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Email escalation received with photo attachments of defective OLED panel." },
        { sender: MessageSender.EMPLOYEE, text: "Mr. Roy, East Regional Head has personally escalated this to LG India OEM Service Director. A brand new replacement panel has been approved." },
      ],
      comments: [
        { author: "Debashis Roy", text: "Escalated to LG OEM Territory Head. Free replacement unit booked from Dankuni warehouse." },
      ],
      aiSuggestion: {
        summary: "High-value TV panel defect email escalation requiring OEM replacement override.",
        suggestedPriority: "CRITICAL",
        suggestedResponse: "Dear Siddharth Roy, we have reviewed your email and TV panel photos. We have approved a complete replacement unit with priority doorstep delivery.",
        suggestedNextSteps: ["Dispatch replacement unit", "Schedule VIP engineer for installation"],
        confidence: 0.98,
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
      createdAt: new Date(now.getTime() - msHour * 28),
      firstResponseAt: new Date(now.getTime() - msHour * 27.5),
      resolvedAt: new Date(now.getTime() - msHour * 2),
      closedAt: null,
      subject: "Delivered Expired Aashirvaad Superior MP Sharbati Atta 10kg in Quick Commerce Order #BLR-40192",
      description: "Received grocery delivery in Koramangala 4th Block. The 10kg Atta bag was torn and near expiry date. Needed immediate replacement.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      resolution: "Replacement 10kg fresh batch Atta bag (Mfg: Aug 2026) delivered via express rider within 45 minutes. Dark store inventory batch quarantined.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Look at the photos of the flour bag delivered today. Kindly replace." },
        { sender: MessageSender.EMPLOYEE, text: "Sneha ji, express replacement rider dispatched right away." },
        { sender: MessageSender.CUSTOMER, text: "Received replacement packet in fresh condition. Thank you for prompt resolution." },
      ],
      comments: [
        { author: "Kavita Reddy", text: "Koramangala dark store manager warned. 14 units from expired batch quarantined." },
      ],
      aiSuggestion: {
        summary: "Customer received damaged 10kg flour packet via Koramangala delivery hub.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Sneha Deshmukh, we deeply regret this quality lapse. Our team has dispatched a fresh replacement immediately.",
        suggestedNextSteps: ["Close ticket with customer confirmation"],
        confidence: 0.95,
      },
    },
    {
      custIdx: 11, // Manpreet Kaur
      categoryCode: "DELIVERY_DELAY",
      channelCode: "EMAIL",
      storeCode: "DEL-CON",
      regionCode: "NORTH",
      priority: "LOW",
      status: ComplaintStatus.CLOSED,
      slaStatus: SlaStatus.MET,
      createdAt: new Date(now.getTime() - msHour * 35),
      firstResponseAt: new Date(now.getTime() - msHour * 34),
      resolvedAt: new Date(now.getTime() - msHour * 8),
      closedAt: new Date(now.getTime() - msHour * 4),
      subject: "Home Delivery of Sleepwell Ortho Mattress Delayed by 3 Days (Order #MTR-CHD-391)",
      description: "Purchased a Queen Size Sleepwell Mattress with guaranteed 48-hour delivery commitment. Delivery arrived on the 5th day without prior communication from logistics dispatch.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      resolution: "Customer accepted delivery. Provided complimentary mattress protector and 2 memory foam pillows as apology gesture.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Mattress finally delivered today. Delivery team was polite." },
        { sender: MessageSender.EMPLOYEE, text: "Thank you for your patience Manpreet ji. We have sent the complimentary pillows as promised." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Customer satisfied with complimentary bedding gift. Ticket closed." },
      ],
      aiSuggestion: {
        summary: "Bulky furniture delivery delay compensated with goodwill merchandise.",
        suggestedPriority: "LOW",
        suggestedResponse: "Dear Manpreet Kaur, thank you for confirming delivery. We appreciate your patience.",
        suggestedNextSteps: ["Close ticket with 5-star rating"],
        confidence: 0.87,
      },
    },
    {
      custIdx: 0, // Aarav Mehta
      categoryCode: "RETURN_REFUND",
      channelCode: "WEBSITE",
      storeCode: "MUM-PHX",
      regionCode: "WEST",
      priority: "MEDIUM",
      status: ComplaintStatus.CLOSED,
      slaStatus: SlaStatus.MET,
      createdAt: new Date(now.getTime() - msHour * 40),
      firstResponseAt: new Date(now.getTime() - msHour * 39),
      resolvedAt: new Date(now.getTime() - msHour * 10),
      closedAt: new Date(now.getTime() - msHour * 5),
      subject: "Instant Return of Defective Philips Shaver at Customer Desk - Bill #INV-MUM-9912",
      description: "Shaver blade motor stopped rotating on first charge. Returned at Lower Parel store desk for instant store credit refund.",
      assignedAgentEmail: "agent@example.com",
      resolution: "Store desk issued instant store gift card refund of Rs. 2,899. Customer purchased Braun Series 3 shaver.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Store credit received on phone. Thank you." },
      ],
      comments: [
        { author: "Rohan Kulkarni", text: "Defective unit sent back to Philips OEM distributor." },
      ],
      aiSuggestion: {
        summary: "Fast counter refund executed for defective small appliance.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Aarav, thank you for visiting our store desk. We hope you enjoy the new trimmer.",
        suggestedNextSteps: ["Mark ticket as resolved"],
        confidence: 0.92,
      },
    },
    {
      custIdx: 4, // Deepika Patel
      categoryCode: "STAFF_BEHAVIOUR",
      channelCode: "GOOGLE_REVIEW",
      storeCode: "MUM-BND",
      regionCode: "WEST",
      priority: "MEDIUM",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      createdAt: new Date(now.getTime() - msHour * 26),
      firstResponseAt: new Date(now.getTime() - msHour * 25),
      resolvedAt: new Date(now.getTime() - msHour * 3),
      subject: "Long 35-Minute Billing Queue Due to Only 1 Counter Active at Bandra Peak Hours",
      description: "Store had over 40 customers waiting on Sunday 6 PM with only 1 POS billing executive logged in. 3 POS machines were left uncrewed. Left review on Google Maps.",
      assignedAgentEmail: "aditya.patel@complaintos.in",
      resolution: "Store manager deployed mandatory 3-counter staffing roster during weekend 4 PM - 9 PM peak rush.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Review left on Google Maps regarding Bandra store billing delays." },
        { sender: MessageSender.EMPLOYEE, text: "Dear Deepika ji, we have modified the floor shift roster to keep all 4 POS terminals active during rush hours." },
      ],
      comments: [
        { author: "Aditya Patel", text: "Store manager SOP compliance checklist updated." },
      ],
      aiSuggestion: {
        summary: "Queue management grievance resolved via shift roster re-allocation.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Deepika Patel, thank you for bringing this to our attention. We have reinforced counter staffing.",
        suggestedNextSteps: ["Close ticket"],
        confidence: 0.90,
      },
    },
    {
      custIdx: 8, // Sunita Agarwal
      categoryCode: "PAYMENT_UPI",
      channelCode: "WHATSAPP",
      storeCode: "GUR-AMB",
      regionCode: "NORTH",
      priority: "HIGH",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      createdAt: new Date(now.getTime() - msHour * 20),
      firstResponseAt: new Date(now.getTime() - msHour * 19),
      resolvedAt: new Date(now.getTime() - msHour * 4),
      subject: "Cred UPI Double Deduction of Rs. 1,450 for Grocery Basket at Ambience Mall",
      description: "Paid via CRED UPI QR scan. Cashier system lagged and timed out. Second scan succeeded. Refund of first payment processed successfully.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      resolution: "Rs. 1,450 credited back to customer Cred UPI balance.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Cred shows 2 successful transactions of Rs 1450 for same store POS ID." },
        { sender: MessageSender.EMPLOYEE, text: "Sunita ji, merchant settlement batch reconciled. Amount reversed." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Settlement reversal successful." },
      ],
      aiSuggestion: {
        summary: "UPI double debit resolved with instant reconciliation credit.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Sunita, your refund of Rs. 1,450 has been settled.",
        suggestedNextSteps: ["Close ticket"],
        confidence: 0.96,
      },
    },
    {
      custIdx: 15, // Meenakshi Swaminathan
      categoryCode: "BILLING_MRP",
      channelCode: "STORE_DESK",
      storeCode: "BLR-IND",
      regionCode: "SOUTH",
      priority: "MEDIUM",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      createdAt: new Date(now.getTime() - msHour * 16),
      firstResponseAt: new Date(now.getTime() - msHour * 15),
      resolvedAt: new Date(now.getTime() - msHour * 1),
      subject: "Special Club 15% Member Discount Omitted on Levi's 511 Denim (Bill #INV-BLR-8819)",
      description: "Member barcode was scanned before billing, but 15% seasonal markdown of Rs. 495 was not subtracted from total bill.",
      assignedAgentEmail: "kavita.reddy@complaintos.in",
      resolution: "Excess amount Rs. 495 refunded via instant store voucher code.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Receipt shows full price without the 15% loyalty markdown." },
        { sender: MessageSender.EMPLOYEE, text: "Meenakshi ji, voucher code of Rs. 495 sent to your registered phone." },
      ],
      comments: [
        { author: "Kavita Reddy", text: "Customer satisfied with voucher." },
      ],
      aiSuggestion: {
        summary: "Loyalty promotional discount omitted at billing.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Meenakshi, voucher of Rs. 495 has been credited.",
        suggestedNextSteps: ["Close ticket"],
        confidence: 0.94,
      },
    },
    {
      custIdx: 12, // Siddharth Roy
      categoryCode: "PRODUCT_QUALITY",
      channelCode: "WEBSITE",
      storeCode: "KOL-PKS",
      regionCode: "EAST",
      priority: "HIGH",
      status: ComplaintStatus.RESOLVED,
      slaStatus: SlaStatus.MET,
      createdAt: new Date(now.getTime() - msHour * 30),
      firstResponseAt: new Date(now.getTime() - msHour * 29),
      resolvedAt: new Date(now.getTime() - msHour * 6),
      subject: "Broken Seal on Imported Nescafe Gold 200g Jar in Park Street Store Delivery",
      description: "Aroma seal under lid was punctured on delivery. Item replaced same day.",
      assignedAgentEmail: "amit.das@complaintos.in",
      resolution: "Fresh jar with intact holographic seal delivered via express delivery rider.",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Lid seal was broken inside the jar. Photo sent." },
        { sender: MessageSender.EMPLOYEE, text: "Replacement jar is on its way with delivery executive." },
      ],
      comments: [
        { author: "Amit Das", text: "Replacement completed and acknowledged by customer." },
      ],
      aiSuggestion: {
        summary: "Damaged product seal replaced same day.",
        suggestedPriority: "HIGH",
        suggestedResponse: "Dear Siddharth, replacement coffee jar has been delivered.",
        suggestedNextSteps: ["Close ticket"],
        confidence: 0.93,
      },
    },
    {
      custIdx: 13, // Ritu Mathur
      categoryCode: "DELIVERY_DELAY",
      channelCode: "WHATSAPP",
      storeCode: "PUN-VIM",
      regionCode: "WEST",
      priority: "MEDIUM",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 6),
      slaDueAt: new Date(now.getTime() + msHour * 18),
      subject: "Split Shipment Delivery: Order #PUN-8819 Received 2 of 4 Items",
      description: "Ordered 4 kitchen storage organizer sets. Logistics delivered package containing only 2 units. Remaining 2 tracking numbers show no update.",
      assignedAgentEmail: "agent@example.com",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Received parcel today with only 2 organizers. Where are the other 2?" },
        { sender: MessageSender.EMPLOYEE, text: "Ritu ji, second parcel is dispatched from Pune Viman Nagar hub and scheduled for delivery tomorrow morning." },
      ],
      comments: [
        { author: "Rohan Kulkarni", text: "Tracked second shipment #PUN-LOG-9921 on vehicle #MH12-8821." },
      ],
      aiSuggestion: {
        summary: "Multi-package shipment tracking inquiry.",
        suggestedPriority: "MEDIUM",
        suggestedResponse: "Dear Ritu Mathur, your second package is out for delivery with rider.",
        suggestedNextSteps: ["Provide live rider tracking link"],
        confidence: 0.91,
      },
    },
    {
      custIdx: 17, // Rahul Verma
      categoryCode: "STAFF_BEHAVIOUR",
      channelCode: "STORE_DESK",
      storeCode: "DEL-SCK",
      regionCode: "NORTH",
      priority: "LOW",
      status: ComplaintStatus.IN_PROGRESS,
      slaStatus: SlaStatus.ON_TRACK,
      createdAt: new Date(now.getTime() - msHour * 3),
      slaDueAt: new Date(now.getTime() + msHour * 21),
      subject: "Incorrect Alteration Measurement of Raymond Formal Trousers at Saket Store",
      description: "Store tailor took trouser length measurement of 40 inches. Tailored output is 38 inches (2 inches short). Store requested 24 hours to re-adjust with extra hem margin.",
      assignedAgentEmail: "neha.sharma@complaintos.in",
      conversation: [
        { sender: MessageSender.CUSTOMER, text: "Trousers altered 2 inches shorter than marked. Need correct re-alteration." },
        { sender: MessageSender.EMPLOYEE, text: "Rahul ji, master tailor at Saket is fixing the hem with express priority." },
      ],
      comments: [
        { author: "Neha Sharma", text: "Re-alteration in progress at Saket tailor station." },
      ],
      aiSuggestion: {
        summary: "In-store tailor adjustment error being rectified.",
        suggestedPriority: "LOW",
        suggestedResponse: "Dear Rahul, your trousers are being re-altered by our master tailor.",
        suggestedNextSteps: ["Notify customer when ready for pickup"],
        confidence: 0.89,
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
    const store = c.storeCode ? stores[c.storeCode] : null;
    const region = regions[c.regionCode];
    const assignedAgent = c.assignedAgentEmail ? staffUsers[c.assignedAgentEmail] : null;

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
        createdAt: c.createdAt ?? new Date(),
        firstResponseAt: (c as any).firstResponseAt ?? (c.conversation.length > 1 ? new Date(c.createdAt.getTime() + 3600000) : null),
        resolvedAt: (c as any).resolvedAt ?? ((c.status as string) === "RESOLVED" || (c.status as string) === "CLOSED" ? new Date(c.createdAt.getTime() + 7200000) : null),
        closedAt: (c as any).closedAt ?? ((c.status as string) === "CLOSED" ? new Date(c.createdAt.getTime() + 10800000) : null),
        resolution: (c as { resolution?: string }).resolution ?? null,
        slaDueAt: c.slaDueAt ?? new Date(c.createdAt.getTime() + 3600000 * 24),
      },
    });

    // Escalation record if escalated
    if (c.status === ComplaintStatus.ESCALATED || (c as any).escalationReason) {
      await prisma.escalation.create({
        data: {
          complaintId: complaint.id,
          escalatedById: assignedAgent?.id ?? staffUsers["agent@example.com"].id,
          escalatedToId: staffUsers["manager@example.com"].id,
          reason: (c as any).escalationReason || "Escalated for senior operations and managerial intervention",
          priority: c.priority,
          status: EscalationStatus.OPEN,
          type: EscalationType.MANAGER,
        },
      });
    }

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
        createdAt: c.createdAt ?? new Date(),
      },
    });

    // SLA record
    await prisma.sLARecord.create({
      data: {
        complaintId: complaint.id,
        slaPolicyId: slaPolicy.id,
        responseDueAt: new Date(c.createdAt.getTime() + 3600000),
        resolutionDueAt: c.slaDueAt ?? new Date(c.createdAt.getTime() + 3600000 * 24),
        firstRespondedAt: c.firstResponseAt ?? (c.conversation.length > 1 ? new Date(c.createdAt.getTime() + 3600000) : null),
        resolvedAt: c.resolvedAt,
        responseBreached: c.slaStatus === SlaStatus.BREACHED || c.slaStatus === SlaStatus.OVERDUE,
        resolutionBreached: c.slaStatus === SlaStatus.BREACHED || c.slaStatus === SlaStatus.OVERDUE,
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
          createdAt: new Date(c.createdAt.getTime() + 1800000),
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
  console.log(`- Created ${customerProfiles.length} Indian customer profiles`);
  console.log(`- Created ${complaintsData.length} Realistic live Indian complaints with rich SLA, escalation, and root cause distributions`);
  console.log("Demo logins (password for all: DemoPass123!):");
  console.log("  Super Admin: admin@example.com (Vikramaditya Singhania)");
  console.log("  Manager:     manager@example.com (Pooja Iyer - Operations Manager)");
  console.log("  Agent:       agent@example.com (Rohan Kulkarni - Senior Support)");
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
