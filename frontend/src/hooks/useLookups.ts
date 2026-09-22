import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useLookups() {
  return useQuery({
    queryKey: ["lookups"],
    queryFn: async () =>
      (await api.get("/lookups")).data.data as {
        regions: Array<{ id: string; name: string }>;
        stores: Array<{ id: string; name: string; regionId: string }>;
        categories: Array<{ id: string; name: string }>;
        channels: Array<{ id: string; name: string }>;
        priorities: Array<{ code: string; name: string }>;
      },
  });
}

export type Complaint = {
  id: string;
  complaintNumber: string;
  status: string;
  priority: string;
  slaStatus: string;
  description: string;
  resolution?: string | null;
  createdAt: string;
  updatedAt?: string;
  slaDueAt?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  customer: { name: string; email: string; phone?: string | null };
  category?: { id: string; name: string } | null;
  channel: { name: string; code?: string };
  region: { name: string };
  store?: { name: string } | null;
  assignedAgent?: { id: string; name: string } | null;
  conversation?: {
    id: string;
    messages: Array<{
      id: string;
      senderType: string;
      authorName?: string | null;
      body: string;
      deliveryStatus: string;
      channelCode?: string | null;
      createdAt: string;
    }>;
  } | null;
  history?: Array<{ id: string; actionType: string; newStatus?: string | null; notes?: string | null; createdAt: string; changedBy?: { name: string } | null }>;
  comments?: Array<{ id: string; comment: string; visibility: string; createdAt: string; authorName?: string | null }>;
  attachments?: Array<{ id: string; fileName: string; mimeType: string; size: number }>;
  escalations?: Array<{ id: string; reason: string; type: string; status: string; createdAt: string }>;
  slaRecords?: Array<{ responseDueAt: string; resolutionDueAt: string; slaPolicy: { name: string; resolutionTimeMinutes: number } }>;
  aiAnalyses?: Array<{ id: string; summary?: string | null; suggestedPriority?: string | null; suggestedResponse?: string | null; status: string; patternNotes?: string | null }>;
};
