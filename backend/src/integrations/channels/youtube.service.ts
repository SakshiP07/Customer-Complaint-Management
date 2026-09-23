import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { YouTubeChannelAdapter } from "./adapters.js";
import { logger } from "../../utils/logger.js";

const youtubeAdapter = new YouTubeChannelAdapter();

interface YouTubeConfig {
  apiKey: string;
  channelIds: string[];
  pollingIntervalMinutes: number;
}

export interface YouTubeCommentItem {
  commentId: string;
  videoId: string;
  videoTitle: string;
  authorName: string;
  authorChannelId: string;
  authorProfileImageUrl?: string;
  text: string;
  publishedAt: string;
  videoUrl: string;
  commentUrl: string;
}

class YouTubePollingService {
  private config: YouTubeConfig | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastChecked: Date | null = null;
  private isSyncing = false;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): YouTubeConfig | null {
    if (!env.YOUTUBE_API_KEY) {
      logger.warn("YouTube integration not configured. Set YOUTUBE_API_KEY environment variable.");
      return null;
    }

    const channelIds = env.YOUTUBE_CHANNEL_IDS
      ? env.YOUTUBE_CHANNEL_IDS.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    if (channelIds.length === 0) {
      logger.warn("YouTube integration not configured. Set YOUTUBE_CHANNEL_IDS environment variable.");
      return null;
    }

    return {
      apiKey: env.YOUTUBE_API_KEY,
      channelIds,
      pollingIntervalMinutes: Number(env.YOUTUBE_POLLING_INTERVAL_MINUTES) || 2,
    };
  }

  getStatus() {
    return {
      configured: Boolean(this.config?.apiKey && this.config?.channelIds?.length),
      channelIds: this.config?.channelIds || [],
      lastChecked: this.lastChecked,
      isPolling: Boolean(this.intervalId),
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const channelId = this.config.channelIds[0];
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${this.config.apiKey}`
      );
      if (!response.ok) return false;
      const data = (await response.json()) as { items?: any[] };
      return Boolean(data.items && data.items.length > 0);
    } catch (error) {
      logger.error(`YouTube connection test failed: ${error}`);
      return false;
    }
  }

  private async fetchVideos(channelId: string): Promise<Array<{ videoId: string; title: string }>> {
    if (!this.config) return [];

    try {
      // 1. First attempt: Use upload playlist (UC... -> UU...) which costs 1 quota unit instead of 100
      const uploadsPlaylistId = channelId.startsWith("UC")
        ? "UU" + channelId.substring(2)
        : channelId;

      logger.info(`Fetching YouTube playlist items for playlist: ${uploadsPlaylistId}`);
      const plResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&key=${this.config.apiKey}&maxResults=15`
      );

      if (plResponse.ok) {
        const plData = (await plResponse.json()) as { items?: any[] };
        if (plData.items && plData.items.length > 0) {
          const videos = plData.items
            .map((item) => {
              const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
              const title = item.snippet?.title || "Untitled Video";
              return { videoId, title };
            })
            .filter((v) => Boolean(v.videoId));
          if (videos.length > 0) {
            return videos;
          }
        }
      }

      // 2. Fallback: Lookup channel details for upload playlist
      const chResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${this.config.apiKey}`
      );
      if (chResponse.ok) {
        const chData = (await chResponse.json()) as { items?: any[] };
        const uploadPl = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (uploadPl) {
          const fallbackPl = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadPl}&key=${this.config.apiKey}&maxResults=15`
          );
          if (fallbackPl.ok) {
            const fallbackData = (await fallbackPl.json()) as { items?: any[] };
            if (fallbackData.items && fallbackData.items.length > 0) {
              return fallbackData.items
                .map((item) => ({
                  videoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId,
                  title: item.snippet?.title || "Untitled Video",
                }))
                .filter((v) => Boolean(v.videoId));
            }
          }
        }
      }

      // 3. Last fallback: search API
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&type=video&order=date&key=${this.config.apiKey}&maxResults=10`
      );
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as { items?: any[] };
        return (searchData.items || []).map((item) => ({
          videoId: item.id?.videoId,
          title: item.snippet?.title || "Untitled Video",
        })).filter((v) => Boolean(v.videoId));
      }

      return [];
    } catch (error) {
      logger.error(`Error fetching YouTube videos for channel ${channelId}: ${error}`);
      return [];
    }
  }

  private async fetchComments(videoId: string, videoTitle: string): Promise<YouTubeCommentItem[]> {
    if (!this.config) return [];

    const allComments: YouTubeCommentItem[] = [];
    let nextPageToken: string | undefined = undefined;

    try {
      do {
        const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
        url.searchParams.set("part", "snippet,replies");
        url.searchParams.set("videoId", videoId);
        url.searchParams.set("key", this.config.apiKey);
        url.searchParams.set("order", "time");
        url.searchParams.set("maxResults", "100");
        if (nextPageToken) {
          url.searchParams.set("pageToken", nextPageToken);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          logger.error(`YouTube commentThreads error: ${response.status} ${response.statusText}`);
          break;
        }

        const data = (await response.json()) as { items?: any[]; nextPageToken?: string };
        const items = data.items || [];

        for (const thread of items) {
          // 1. Top level comment
          const topComment = thread.snippet?.topLevelComment?.snippet || {};
          const topCommentId = thread.id || thread.snippet?.topLevelComment?.id || "";
          const topAuthorChannelIdRaw = topComment.authorChannelId;
          const topAuthorChannelId =
            typeof topAuthorChannelIdRaw === "object"
              ? topAuthorChannelIdRaw?.value || ""
              : String(topAuthorChannelIdRaw || "");

          if (topCommentId && (topComment.textDisplay || topComment.textOriginal)) {
            allComments.push({
              commentId: topCommentId,
              videoId,
              videoTitle,
              authorName: topComment.authorDisplayName || "YouTube User",
              authorChannelId: topAuthorChannelId || "anonymous",
              authorProfileImageUrl: topComment.authorProfileImageUrl || "",
              text: topComment.textDisplay || topComment.textOriginal || "",
              publishedAt: topComment.publishedAt || new Date().toISOString(),
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              commentUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${topCommentId}`,
            });
          }

          // 2. Extracted replies in thread
          if (thread.replies?.comments && Array.isArray(thread.replies.comments)) {
            for (const rep of thread.replies.comments) {
              const repSnippet = rep.snippet || {};
              const repId = rep.id || "";
              const repAuthorRaw = repSnippet.authorChannelId;
              const repAuthorId =
                typeof repAuthorRaw === "object" ? repAuthorRaw?.value || "" : String(repAuthorRaw || "");

              if (repId && (repSnippet.textDisplay || repSnippet.textOriginal)) {
                allComments.push({
                  commentId: repId,
                  videoId,
                  videoTitle,
                  authorName: repSnippet.authorDisplayName || "YouTube User (Reply)",
                  authorChannelId: repAuthorId || "anonymous",
                  authorProfileImageUrl: repSnippet.authorProfileImageUrl || "",
                  text: repSnippet.textDisplay || repSnippet.textOriginal || "",
                  publishedAt: repSnippet.publishedAt || new Date().toISOString(),
                  videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                  commentUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${repId}`,
                });
              }
            }
          }
        }

        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      return allComments;
    } catch (error) {
      logger.error(`Error fetching YouTube comments for video ${videoId}: ${error}`);
      return allComments;
    }
  }

  async syncNow(): Promise<{ fetched: number; items: any[]; message: string }> {
    if (this.isSyncing) {
      return { fetched: 0, items: [], message: "Sync already in progress" };
    }

    this.isSyncing = true;
    const createdComplaints: any[] = [];

    try {
      if (!this.config) {
        this.config = this.loadConfig();
      }

      if (!this.config) {
        return { fetched: 0, items: [], message: "YouTube integration is not configured" };
      }

      logger.info("Executing instant YouTube comments sync...");

      const [defaultRegion, defaultCategory, channel, defaultCompany] = await Promise.all([
        prisma.region.findFirst({ where: { isActive: true } }),
        prisma.complaintCategory.findFirst({ where: { isActive: true } }),
        prisma.complaintChannel.findFirst({ where: { code: "YOUTUBE", isActive: true } }),
        prisma.company.findFirst({ where: { isActive: true } }),
      ]);

      if (!defaultRegion || !defaultCategory || !channel) {
        logger.error("Missing required default region, category, or YOUTUBE channel record.");
        return { fetched: 0, items: [], message: "Database missing YOUTUBE channel or categories." };
      }

      const targetCompanyId = defaultCompany?.id || "564b59d2-98d2-405f-bfc6-4b16be238024";

      for (const channelId of this.config.channelIds) {
        const videos = await this.fetchVideos(channelId);
        logger.info(`Found ${videos.length} videos for YouTube channel: ${channelId}`);

        for (const video of videos) {
          const comments = await this.fetchComments(video.videoId, video.title);
          logger.info(`Fetched ${comments.length} total comments & replies for video "${video.title}" (${video.videoId})`);

          for (const comment of comments) {
            if (!comment.commentId || !comment.text) continue;

            // Check if this comment was already ingested (by commentId in subject or description)
            const existing = await prisma.complaint.findFirst({
              where: {
                OR: [
                  { subject: { contains: comment.commentId, mode: "insensitive" } },
                  { description: { contains: comment.commentId, mode: "insensitive" } },
                ],
              },
            });

            if (existing) {
              continue;
            }

            // Clean author email
            const safeAuthorId = comment.authorChannelId.replace(/[^a-zA-Z0-9_-]/g, "");
            const email = `${safeAuthorId || "user"}@youtube.com`.toLowerCase();

            // Construct formatted description with YouTube Video Metadata
            const structuredDescription = [
              `[YouTube Video ID: ${comment.videoId}]`,
              `[YouTube Video Title: ${comment.videoTitle}]`,
              `[YouTube Comment ID: ${comment.commentId}]`,
              `[YouTube Video Link: ${comment.videoUrl}]`,
              `[YouTube Comment Link: ${comment.commentUrl}]`,
              "",
              comment.text.replace(/<br\s*[\/]?>/gi, "\n"),
            ].join("\n");

            const subject = `YouTube Comment on "${comment.videoTitle}" [${comment.commentId}]`;

            const created = await prisma.$transaction(async (tx) => {
              let profile = await tx.customerProfile.findFirst({ where: { email } });
              if (!profile) {
                profile = await tx.customerProfile.create({
                  data: {
                    name: comment.authorName,
                    email,
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
                  region: true,
                },
              });

              await tx.complaintStatusHistory.create({
                data: {
                  complaintId: complaint.id,
                  actionType: "CREATED",
                  newStatus: "CATEGORISED",
                  notes: `Ingested from YouTube comment on video "${comment.videoTitle}"`,
                },
              });

              await tx.conversation.create({
                data: {
                  complaintId: complaint.id,
                  messages: {
                    create: {
                      senderType: "CUSTOMER",
                      authorName: comment.authorName,
                      body: comment.text,
                      deliveryStatus: "SENT",
                      channelCode: "YOUTUBE",
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
              authorName: comment.authorName,
              videoTitle: comment.videoTitle,
              videoId: comment.videoId,
            });

            logger.info(`Successfully ingested YouTube comment ${comment.commentId} as ${created.complaintNumber}`);
          }
        }
      }

      this.lastChecked = new Date();
      return {
        fetched: createdComplaints.length,
        items: createdComplaints,
        message: `Successfully fetched ${createdComplaints.length} new YouTube comments.`,
      };
    } catch (error: any) {
      logger.error(`Error during YouTube comments sync: ${error?.message || error}`);
      return { fetched: 0, items: [], message: `Error syncing YouTube comments: ${error?.message || error}` };
    } finally {
      this.isSyncing = false;
    }
  }

  startPolling(intervalSeconds: number = 8) {
    if (!this.config) {
      logger.warn("YouTube polling not started: not configured");
      return;
    }

    if (this.intervalId) {
      logger.warn("YouTube polling already running");
      return;
    }

    const intervalMs = intervalSeconds * 1000;
    logger.info(`Starting real-time YouTube polling every ${intervalSeconds} seconds`);

    // Initial check
    this.syncNow().catch((err) => logger.error("Initial YouTube sync error:", err));

    // Set up interval
    this.intervalId = setInterval(() => {
      this.syncNow().catch((err) => logger.error("Periodic YouTube sync error:", err));
    }, intervalMs);
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("YouTube polling stopped");
    }
  }
}

export const youtubePollingService = new YouTubePollingService();

