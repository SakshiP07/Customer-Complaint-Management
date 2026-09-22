import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { YouTubeChannelAdapter } from "./adapters.js";
import { complaintService } from "../../services/complaint.service.js";
import { logger } from "../../utils/logger.js";

const youtubeAdapter = new YouTubeChannelAdapter();

interface YouTubeConfig {
  apiKey: string;
  channelIds: string[];
  pollingIntervalMinutes: number;
}

class YouTubePollingService {
  private config: YouTubeConfig | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastChecked: Date | null = null;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): YouTubeConfig | null {
    if (!env.YOUTUBE_API_KEY) {
      logger.warn("YouTube integration not configured. Set YOUTUBE_API_KEY environment variable.");
      return null;
    }

    const channelIds = env.YOUTUBE_CHANNEL_IDS ? env.YOUTUBE_CHANNEL_IDS.split(',').map(id => id.trim()) : [];
    
    if (channelIds.length === 0) {
      logger.warn("YouTube integration not configured. Set YOUTUBE_CHANNEL_IDS environment variable.");
      return null;
    }

    return {
      apiKey: env.YOUTUBE_API_KEY,
      channelIds,
      pollingIntervalMinutes: env.YOUTUBE_POLLING_INTERVAL_MINUTES || 2,
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&id=${this.config.channelIds[0]}&key=${this.config.apiKey}`
      );
      return response.ok;
    } catch (error) {
      logger.error(`YouTube connection test failed: ${error}`);
      return false;
    }
  }

  private async fetchComments(videoId: string): Promise<any[]> {
    if (!this.config) return [];

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${this.config.apiKey}&order=time&maxResults=20`
      );
      
      if (!response.ok) {
        logger.error(`YouTube API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { items?: any[] };
      return data.items || [];
    } catch (error) {
      logger.error(`Error fetching YouTube comments for video ${videoId}: ${error}`);
      return [];
    }
  }

  private async fetchVideos(channelId: string): Promise<any[]> {
    if (!this.config) return [];

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&type=video&order=date&key=${this.config.apiKey}&maxResults=10`
      );
      
      if (!response.ok) {
        logger.error(`YouTube API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { items?: any[] };
      return data.items || [];
    } catch (error) {
      logger.error(`Error fetching YouTube videos for channel ${channelId}: ${error}`);
      return [];
    }
  }

  private async checkYouTubeComments() {
    try {
      logger.info('Checking YouTube for new comments...');
      
      if (!this.config) {
        logger.warn('YouTube not configured');
        return;
      }

      for (const channelId of this.config.channelIds) {
        logger.info(`Fetching videos for channel: ${channelId}`);
        const videos = await this.fetchVideos(channelId);
        logger.info(`Found ${videos.length} videos for channel ${channelId}`);
        
        for (const video of videos) {
          const videoId = video.id.videoId;
          const videoTitle = video.snippet.title;
          
          logger.info(`Fetching comments for video: ${videoTitle} (${videoId})`);
          const comments = await this.fetchComments(videoId);
          logger.info(`Found ${comments.length} comments for video ${videoId}`);
          
          for (const commentThread of comments) {
            const comment = commentThread.snippet.topLevelComment.snippet;
            const commentId = commentThread.id;
            const publishedAt = comment.publishedAt;
            
            logger.info(`Processing comment: ${commentId} from ${publishedAt}`);
            
            // Skip if comment is older than last check
            if (this.lastChecked && new Date(publishedAt) < this.lastChecked) {
              logger.info(`Skipping comment ${commentId} - older than last check (${publishedAt} < ${this.lastChecked})`);
              continue;
            }

            // Check if this comment was already processed by subject
            const existing = await prisma.complaint.findFirst({
              where: {
                subject: {
                  contains: commentId,
                  mode: 'insensitive',
                },
              },
            });

            if (existing) {
              logger.info(`Skipping comment ${commentId} - already processed`);
              continue;
            }

            // Convert comment to complaint
            const normalised = await youtubeAdapter.ingest({
              videoId,
              videoTitle,
              commentId,
              authorName: comment.authorDisplayName,
              authorChannelId: comment.authorChannelId,
              text: comment.textDisplay,
              publishedAt,
            });

            // Add comment ID to subject for deduplication
            normalised.subject = `${normalised.subject} [${commentId}]`;

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
              logger.error('Missing required region or category configuration for YouTube complaint');
              return;
            }

            // Create complaint directly with YOUTUBE channel
            const [region, category, channel] = await Promise.all([
              prisma.region.findFirst({ where: { id: normalised.regionId, isActive: true } }),
              prisma.complaintCategory.findFirst({ where: { id: normalised.categoryId, isActive: true } }),
              prisma.complaintChannel.findFirst({ where: { code: "YOUTUBE", isActive: true } }),
            ]);

            if (!region || !category || !channel) {
              logger.error('Missing required configuration for YouTube complaint');
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
                  notes: `Complaint received from YOUTUBE`,
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
                      channelCode: 'YOUTUBE',
                    },
                  },
                },
              });

              return created;
            });

            logger.info(`Created complaint from YouTube comment: ${commentId}`);
          }
        }
      }

      this.lastChecked = new Date();
      
    } catch (error) {
      logger.error(`Error checking YouTube comments: ${error}`);
    }
  }

  startPolling(intervalMinutes?: number) {
    if (!this.config) {
      logger.warn('YouTube polling not started: not configured');
      return;
    }

    if (this.intervalId) {
      logger.warn('YouTube polling already running');
      return;
    }

    const interval = (intervalMinutes || this.config.pollingIntervalMinutes) * 60 * 1000;
    
    logger.info(`Starting YouTube polling every ${interval / 60000} minutes`);
    
    // Initial check
    this.checkYouTubeComments();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkYouTubeComments();
    }, interval);
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('YouTube polling stopped');
    }
  }
}

export const youtubePollingService = new YouTubePollingService();
