import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { EmailChannelAdapter } from "./adapters.js";
import { logger } from "../../utils/logger.js";

const emailAdapter = new EmailChannelAdapter();

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export class EmailPollingService {
  private config: EmailConfig;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastChecked: Date | null = null;
  private isSyncing = false;

  constructor() {
    this.config = {
      host: env.EMAIL_IMAP_HOST || env.EMAIL_HOST || "imap.gmail.com",
      port: Number(env.EMAIL_IMAP_PORT || env.EMAIL_PORT) || 993,
      user: env.EMAIL_USER || "",
      password: env.EMAIL_PASSWORD || "",
      tls: env.EMAIL_TLS !== "false",
    };
  }

  isConfigured(): boolean {
    return !!(this.config.user && this.config.password);
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      user: this.config.user ? `${this.config.user.slice(0, 3)}***@${this.config.user.split("@")[1] || "gmail.com"}` : "Not set",
      host: this.config.host,
      lastChecked: this.lastChecked,
      isPolling: Boolean(this.pollInterval),
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.tls,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
        logger: false,
      });

      await client.connect();
      await client.logout();
      return true;
    } catch (error) {
      logger.error(`Email connection test failed: ${error}`);
      return false;
    }
  }

  async syncNow(): Promise<{ fetched: number; items: any[]; message: string }> {
    if (this.isSyncing) {
      return { fetched: 0, items: [], message: "Email sync already in progress" };
    }

    if (!this.isConfigured()) {
      return { fetched: 0, items: [], message: "Email integration is not configured" };
    }

    this.isSyncing = true;
    const createdComplaints: any[] = [];

    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.tls,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      logger: false,
    });

    try {
      logger.info("Executing instant email sync...");
      await client.connect();
      await client.mailboxOpen("INBOX");

      // Search for unseen or recent emails
      const searchCriteria: Record<string, any> = { seen: false };
      if (this.lastChecked) {
        searchCriteria.since = this.lastChecked;
      }

      const messages = await client.search(searchCriteria);

      if (!messages || messages.length === 0) {
        this.lastChecked = new Date();
        return { fetched: 0, items: [], message: "No new unread emails found in inbox." };
      }

      logger.info(`Found ${messages.length} unread emails`);

      const [defaultRegion, defaultCategory, channel, defaultCompany] = await Promise.all([
        prisma.region.findFirst({ where: { isActive: true } }),
        prisma.complaintCategory.findFirst({ where: { isActive: true } }),
        prisma.complaintChannel.findFirst({ where: { code: "EMAIL", isActive: true } }),
        prisma.company.findFirst({ where: { isActive: true } }),
      ]);

      if (!defaultRegion || !defaultCategory || !channel) {
        return { fetched: 0, items: [], message: "Database missing EMAIL channel or default taxonomy." };
      }

      const targetCompanyId = defaultCompany?.id || "564b59d2-98d2-405f-bfc6-4b16be238024";

      for (const uid of messages) {
        try {
          const message = await client.fetchOne(uid, { source: true });
          if (!message || !message.source) continue;

          const parsed = await simpleParser(message.source);
          const messageId = parsed.messageId || `email-${uid}-${Date.now()}`;

          // Check deduplication by message ID
          const existing = await prisma.complaint.findFirst({
            where: {
              OR: [
                { subject: { contains: messageId, mode: "insensitive" } },
                { description: { contains: messageId, mode: "insensitive" } },
              ],
            },
          });

          if (existing) {
            continue;
          }

          const normalised = await emailAdapter.ingest({
            from: parsed.from,
            subject: parsed.subject || "No Subject",
            text: parsed.text || parsed.html || "No content",
            html: parsed.html || "",
          });

          const fromEmail = normalised.email.toLowerCase();
          const senderName = normalised.name || "Email Customer";
          const subject = `${parsed.subject || "Customer Grievance via Email"} [${messageId}]`;

          const structuredDescription = [
            `[Email From: ${senderName} <${fromEmail}>]`,
            `[Email Message ID: ${messageId}]`,
            `[Email Date: ${parsed.date ? parsed.date.toISOString() : new Date().toISOString()}]`,
            "",
            normalised.description,
          ].join("\n");

          const created = await prisma.$transaction(async (tx) => {
            let profile = await tx.customerProfile.findFirst({ where: { email: fromEmail } });
            if (!profile) {
              profile = await tx.customerProfile.create({
                data: {
                  name: senderName,
                  email: fromEmail,
                  phone: null,
                  preferredContactMethod: "EMAIL",
                },
              });
            }

            const year = new Date().getFullYear();
            const sequence = await tx.complaintSequence.upsert({
              where: { year },
              create: { year, lastNumber: 1 },
              update: { lastNumber: { increment: 1 } },
            });

            const complaintNumber = `CMP-${year}-${String(sequence.lastNumber).padStart(6, "0")}`;

            const complaint = await tx.complaint.create({
              data: {
                complaintNumber,
                customerId: profile.id,
                channelId: channel.id,
                categoryId: defaultCategory.id,
                companyId: targetCompanyId,
                priority: "MEDIUM",
                status: "CATEGORISED",
                subject,
                description: structuredDescription,
                regionId: defaultRegion.id,
                storeId: null,
              },
              include: {
                customer: true,
                channel: true,
                category: true,
              },
            });

            await tx.complaintStatusHistory.create({
              data: {
                complaintId: complaint.id,
                actionType: "CREATED",
                newStatus: "CATEGORISED",
                notes: `Complaint ingested from Email: ${parsed.subject || "No Subject"}`,
              },
            });

            await tx.conversation.create({
              data: {
                complaintId: complaint.id,
                messages: {
                  create: {
                    senderType: "CUSTOMER",
                    authorName: senderName,
                    body: normalised.description,
                    deliveryStatus: "SENT",
                    channelCode: "EMAIL",
                  },
                },
              },
            });

            return complaint;
          });

          createdComplaints.push({
            id: created.id,
            complaintNumber: created.complaintNumber,
            subject: created.subject,
            from: fromEmail,
          });

          logger.info(`Created complaint from email: ${parsed.subject} -> ${created.complaintNumber}`);
        } catch (msgErr: any) {
          logger.error(`Error processing email message ${uid}: ${msgErr?.message || msgErr}`);
        }
      }

      this.lastChecked = new Date();
      return {
        fetched: createdComplaints.length,
        items: createdComplaints,
        message: `Successfully fetched ${createdComplaints.length} new email grievances.`,
      };
    } catch (error: any) {
      logger.error(`Error during email sync: ${error?.message || error}`);
      return { fetched: 0, items: [], message: `Error syncing emails: ${error?.message || error}` };
    } finally {
      try {
        await client.logout();
      } catch {
        // ignore logout errors
      }
      this.isSyncing = false;
    }
  }

  async startPolling(intervalSeconds: number = 8) {
    if (this.pollInterval) {
      logger.warn("Email polling already started");
      return;
    }

    if (!this.isConfigured()) {
      logger.warn("Email integration not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.");
      return;
    }

    const intervalMs = intervalSeconds * 1000;
    logger.info(`Starting real-time email polling every ${intervalSeconds} seconds`);

    // Initial check
    this.syncNow().catch((err) => logger.error("Initial email sync error:", err));

    // Set up periodic polling
    this.pollInterval = setInterval(async () => {
      this.syncNow().catch((err) => logger.error("Periodic email sync error:", err));
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.info("Email polling stopped");
    }
  }
}

export const emailPollingService = new EmailPollingService();

