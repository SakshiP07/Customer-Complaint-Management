import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { EmailChannelAdapter } from './adapters.js';
import { complaintService } from '../../services/complaint.service.js';
import { logger } from '../../utils/logger.js';

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

  constructor() {
    this.config = {
      host: env.EMAIL_IMAP_HOST || 'imap.gmail.com',
      port: Number(env.EMAIL_IMAP_PORT) || 993,
      user: env.EMAIL_USER || '',
      password: env.EMAIL_PASSWORD || '',
      tls: env.EMAIL_TLS !== 'false',
    };
  }

  isConfigured(): boolean {
    return !!(this.config.user && this.config.password);
  }

  async startPolling(intervalMinutes: number = 5) {
    if (this.pollInterval) {
      logger.warn('Email polling already started');
      return;
    }

    if (!this.isConfigured()) {
      logger.warn('Email integration not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.');
      return;
    }

    logger.info(`Starting email polling every ${intervalMinutes} minutes`);
    
    // Initial check
    await this.checkEmails();

    // Set up periodic polling
    this.pollInterval = setInterval(async () => {
      await this.checkEmails();
    }, intervalMinutes * 60 * 1000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      logger.info('Email polling stopped');
    }
  }

  private async checkEmails() {
    try {
      logger.info('Checking for new emails...');
      
      const client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.tls,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
        logger: false, // Disable IMAP connection logging to prevent credential exposure
      });

      await client.connect();

      const mailbox = await client.mailboxOpen('INBOX');
      
      // Search for unseen emails
      const searchCriteria = { seen: false };
      if (this.lastChecked) {
        Object.assign(searchCriteria, { since: this.lastChecked });
      }

      const messages = await client.search(searchCriteria);
      
      if (!messages || messages.length === 0) {
        logger.info('No new emails found');
        await client.logout();
        this.lastChecked = new Date();
        return;
      }

      logger.info(`Found ${messages.length} new emails`);

      for (const uid of messages) {
        try {
          const message = await client.fetchOne(uid, { source: true });
          if (!message || !message.source) {
            logger.warn(`No source for message ${uid}`);
            continue;
          }
          
          const parsed = await simpleParser(message.source);
          
          // Check if this email was already processed using Message-ID
          const messageId = parsed.messageId || '';
          if (messageId) {
            const existing = await prisma.complaint.findFirst({
              where: {
                subject: {
                  contains: messageId,
                  mode: 'insensitive',
                },
              },
            });

            if (existing) {
              logger.info(`Email already processed: ${messageId}`);
              continue;
            }
          }
          
          // Convert email to complaint
          const normalised = await emailAdapter.ingest({
            from: parsed.from,
            subject: parsed.subject || '',
            text: parsed.text || parsed.html || '',
            html: parsed.html || '',
          });

          // Add Message-ID to subject for deduplication
          if (messageId) {
            normalised.subject = `${normalised.subject} [${messageId}]`;
          }

          // Get default region if not set
          if (!normalised.regionId) {
            const defaultRegion = await prisma.region.findFirst({ where: { isActive: true } });
            if (defaultRegion) {
              normalised.regionId = defaultRegion.id;
            }
          }

          // Get default category if not set
          if (!normalised.categoryId) {
            const defaultCategory = await prisma.complaintCategory.findFirst({ where: { isActive: true } });
            if (defaultCategory) {
              normalised.categoryId = defaultCategory.id;
            }
          }

          // Ensure we have valid IDs before querying
          if (!normalised.regionId || !normalised.categoryId) {
            logger.error('Missing required region or category configuration for email complaint');
            return;
          }

          // Create complaint directly with EMAIL channel
          const [region, category, channel] = await Promise.all([
            prisma.region.findFirst({ where: { id: normalised.regionId, isActive: true } }),
            prisma.complaintCategory.findFirst({ where: { id: normalised.categoryId!, isActive: true } }),
            prisma.complaintChannel.findFirst({ where: { code: "EMAIL", isActive: true } }),
          ]);

          if (!region || !category || !channel) {
            logger.error('Missing required configuration for email complaint');
            return;
          }

          const email = normalised.email.toLowerCase();
          const complaint = await prisma.$transaction(async (tx) => {
            let profile = await tx.customerProfile.findFirst({ where: { email } });
            if (!profile) {
              profile = await tx.customerProfile.create({
                data: {
                  name: normalised.name,
                  email,
                  phone: normalised.phone,
                  preferredContactMethod: 'EMAIL',
                },
              });
            }

            const year = new Date().getFullYear();
            const sequence = await tx.complaintSequence.findUnique({ where: { year } });
            const nextNumber = (sequence?.lastNumber ?? 0) + 1;
            const complaintNumber = `CMP-${year}-${String(nextNumber).padStart(6, '0')}`;

            const created = await tx.complaint.create({
              data: {
                complaintNumber,
                customerId: profile.id,
                channelId: channel.id,
                categoryId: category.id,
                priority: 'MEDIUM',
                status: 'CATEGORISED',
                subject: normalised.subject,
                description: normalised.description,
                regionId: region.id,
                storeId: normalised.storeId || null,
              },
            });

            await tx.complaintSequence.upsert({
              where: { year },
              update: { lastNumber: nextNumber },
              create: { year, lastNumber: nextNumber },
            });

            await tx.complaintStatusHistory.create({
              data: {
                complaintId: created.id,
                actionType: 'CREATED',
                newStatus: 'CATEGORISED',
                notes: `Complaint received from EMAIL`,
              },
            });

            await tx.conversation.create({
              data: {
                complaintId: created.id,
                messages: {
                  create: {
                    senderType: 'CUSTOMER',
                    authorName: normalised.name,
                    body: normalised.description,
                    deliveryStatus: 'SENT',
                    channelCode: 'EMAIL',
                  },
                },
              },
            });

            return created;
          });

          logger.info(`Created complaint from email: ${parsed.subject}`);
        } catch (error) {
          logger.error(`Error processing email: ${error}`);
        }
      }

      await client.logout();
      this.lastChecked = new Date();
      
    } catch (error) {
      logger.error(`Error checking emails: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.tls,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });

      await client.connect();
      await client.logout();
      return true;
    } catch (error) {
      logger.error(`Email connection test failed: ${error}`);
      return false;
    }
  }
}

export const emailPollingService = new EmailPollingService();
