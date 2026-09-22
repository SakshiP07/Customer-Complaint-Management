export type NormalisedComplaint = {
  channelCode: string;
  name: string;
  email: string;
  phone?: string | null;
  regionId: string;
  storeId?: string | null;
  categoryId?: string | null;
  description: string;
  subject?: string | null;
  rawPayload?: Record<string, unknown>;
};

export interface ChannelAdapter {
  readonly channelCode: string;
  readonly live: boolean;
  ingest(payload: unknown): Promise<NormalisedComplaint>;
}

export class WebsiteChannelAdapter implements ChannelAdapter {
  readonly channelCode = "WEBSITE";
  readonly live = true;
  async ingest(payload: unknown): Promise<NormalisedComplaint> {
    const body = payload as Record<string, unknown>;
    return {
      channelCode: this.channelCode,
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : null,
      regionId: String(body.regionId ?? ""),
      storeId: body.storeId ? String(body.storeId) : null,
      categoryId: body.categoryId ? String(body.categoryId) : null,
      description: String(body.description ?? ""),
      subject: body.subject ? String(body.subject) : null,
    };
  }
}

export class EmailChannelAdapter implements ChannelAdapter {
  readonly channelCode = "EMAIL";
  readonly live = true;
  async ingest(payload: unknown): Promise<NormalisedComplaint> {
    const email = payload as {
      from?: { name?: string; address?: string; value?: Array<{ address: string; name?: string }> } | string;
      subject: string;
      text: string;
      html?: string;
    };
    
    let name = 'Unknown';
    let emailAddr = '';
    
    // Handle various formats of the 'from' field from mailparser
    if (typeof email.from === 'string') {
      emailAddr = email.from;
      name = emailAddr.split('@')[0];
    } else if (email.from) {
      if (email.from.value && Array.isArray(email.from.value) && email.from.value.length > 0) {
        // mailparser format with value array
        emailAddr = email.from.value[0].address || '';
        name = email.from.value[0].name || emailAddr.split('@')[0];
      } else {
        // Simple object format
        emailAddr = email.from.address || '';
        name = email.from.name || emailAddr.split('@')[0];
      }
    }
    
    // Fallback if email is still empty
    if (!emailAddr) {
      emailAddr = 'unknown@example.com';
    }
    if (!name || name === 'Unknown') {
      name = emailAddr.split('@')[0];
    }
    
    return {
      channelCode: this.channelCode,
      name: name,
      email: emailAddr,
      phone: null,
      regionId: "", // Will need to be determined or defaulted
      storeId: null,
      categoryId: null,
      description: email.text || email.html || "",
      subject: email.subject,
      rawPayload: { email },
    };
  }
}

export class YouTubeChannelAdapter implements ChannelAdapter {
  readonly channelCode = "YOUTUBE";
  readonly live = true;
  async ingest(payload: unknown): Promise<NormalisedComplaint> {
    const comment = payload as {
      videoId: string;
      videoTitle: string;
      commentId: string;
      authorName: string;
      authorChannelId: string;
      text: string;
      publishedAt: string;
    };
    
    return {
      channelCode: this.channelCode,
      name: comment.authorName,
      email: `${comment.authorChannelId}@youtube.com`, // YouTube doesn't provide email
      phone: null,
      regionId: "", // Will need to be determined or defaulted
      storeId: null,
      categoryId: null,
      description: comment.text,
      subject: `Comment on video: ${comment.videoTitle}`,
      rawPayload: { comment },
    };
  }
}

export const channelAdapters: Record<string, ChannelAdapter> = {
  WEBSITE: new WebsiteChannelAdapter(),
  EMAIL: new EmailChannelAdapter(),
  YOUTUBE: new YouTubeChannelAdapter(),
};

export function getChannelAdapter(code: string) {
  return channelAdapters[code];
}
