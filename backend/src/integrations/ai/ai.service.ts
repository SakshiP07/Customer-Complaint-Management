import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import type { AuthUser } from "../../types/express.d.ts";
import { scopedWhere } from "../../repositories/complaint.repo.js";

export type AISuggestion = {
  available: boolean;
  provider: string;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  suggestedPriority: string | null;
  summary: string | null;
  suggestedResponse: string | null;
  suggestedNextSteps: string[];
  similarComplaints: Array<{ id: string; complaintNumber: string; similarityNote: string }>;
  patternNotes: string | null;
  confidence: number | null;
};

export interface AIProvider {
  readonly name: string;
  analyse(input: {
    description: string;
    conversation: string;
    categories: Array<{ id: string; name: string; code: string }>;
    similar: Array<{ id: string; complaintNumber: string; description: string; categoryName: string | null }>;
  }): Promise<Omit<AISuggestion, "available" | "similarComplaints"> & { similarNotes: string[] }>;
}

class MockAIProvider implements AIProvider {
  readonly name = "MOCK";
  async analyse(input: {
    description: string;
    conversation: string;
    categories: Array<{ id: string; name: string; code: string }>;
    similar: Array<{ id: string; complaintNumber: string; description: string; categoryName: string | null }>;
  }) {
    const text = `${input.description} ${input.conversation}`.toLowerCase();
    const keywordMap: Array<[RegExp, string]> = [
      [/bill|invoice|charge|overcharg/, "BILLING"],
      [/payment|upi|card|failed transaction/, "PAYMENT"],
      [/quality|damaged|expired|defect/, "PRODUCT_QUALITY"],
      [/stock|unavailable|out of stock/, "PRODUCT_AVAILABILITY"],
      [/refund|return|exchange/, "RETURN_REFUND"],
      [/rude|behaviour|behavior|staff/, "STAFF_BEHAVIOUR"],
      [/store|queue|clean|hygiene/, "STORE_EXPERIENCE"],
      [/delivery|courier|late order/, "DELIVERY"],
      [/price|mrp|discount/, "PRICING"],
      [/hold|wait|customer service|call/, "CUSTOMER_SERVICE"],
    ];
    const matched = keywordMap.find(([re]) => re.test(text));
    const category = input.categories.find((c) => c.code === (matched?.[1] ?? "OTHER")) ?? input.categories[0] ?? null;
    const priority = /urgent|unsafe|fraud|legal|critical/.test(text)
      ? "CRITICAL"
      : /refund|overcharg|damaged|rude/.test(text)
        ? "HIGH"
        : /delay|missing|stock/.test(text)
          ? "MEDIUM"
          : "LOW";
    return {
      provider: this.name,
      suggestedCategoryId: category?.id ?? null,
      suggestedCategoryName: category?.name ?? null,
      suggestedPriority: priority,
      summary: input.description.slice(0, 220),
      suggestedResponse: `Dear Customer, we apologise for the inconvenience. We have reviewed your concern${category ? ` regarding ${category.name.toLowerCase()}` : ""} and our team is investigating. We will update you with the next steps. This draft must be reviewed by an employee before sending.`,
      suggestedNextSteps: [
        "Verify the original transaction or store record.",
        "Check for duplicate charges, missing stock, or related tickets.",
        "Confirm the current status with the relevant store or finance team.",
        "Prepare a correction, refund, or replacement if evidence supports it.",
        "Inform the customer using a reviewed response — do not auto-send.",
      ],
      similarNotes: input.similar.slice(0, 3).map((s) => `${s.complaintNumber} (${s.categoryName ?? "uncategorised"})`),
      patternNotes: input.similar.length >= 3
        ? "Potential pattern detected: several similar complaints exist in the recent period. This is not a confirmed root cause."
        : null,
      confidence: matched ? 0.62 : 0.35,
    };
  }
}

class OpenAIProvider implements AIProvider {
  readonly name = "OPENAI";
  async analyse(input: {
    description: string;
    conversation: string;
    categories: Array<{ id: string; name: string; code: string }>;
    similar: Array<{ id: string; complaintNumber: string; description: string; categoryName: string | null }>;
  }) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You assist retail customer-service employees. Return JSON with keys suggestedCategoryCode, suggestedPriority, summary, suggestedResponse, suggestedNextSteps (string array), patternNotes. Never claim a root cause is confirmed. Never send a customer response without human review.",
          },
          {
            role: "user",
            content: JSON.stringify({
              description: input.description,
              conversation: input.conversation,
              categories: input.categories.map((c) => ({ code: c.code, name: c.name })),
              similarCount: input.similar.length,
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw ApiError.unprocessable("AI provider request failed");
    }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim()) as {
      suggestedCategoryCode?: string;
      suggestedPriority?: string;
      summary?: string;
      suggestedResponse?: string;
      suggestedNextSteps?: string[];
      patternNotes?: string;
    };
    const category = input.categories.find((c) => c.code === parsed.suggestedCategoryCode) ?? input.categories[0] ?? null;
    return {
      provider: this.name,
      suggestedCategoryId: category?.id ?? null,
      suggestedCategoryName: category?.name ?? null,
      suggestedPriority: parsed.suggestedPriority ?? "MEDIUM",
      summary: parsed.summary ?? input.description.slice(0, 220),
      suggestedResponse: parsed.suggestedResponse ?? null,
      suggestedNextSteps: parsed.suggestedNextSteps ?? [],
      similarNotes: input.similar.map((s) => s.complaintNumber),
      patternNotes: parsed.patternNotes ?? null,
      confidence: 0.7,
    };
  }
}

function getProvider(): AIProvider | null {
  if (env.AI_PROVIDER === "OPENAI" && env.AI_API_KEY) {
    return new OpenAIProvider();
  }
  if (env.AI_PROVIDER === "OPENAI" && !env.AI_API_KEY) {
    return null;
  }
  return new MockAIProvider();
}

export const aiService = {
  isAvailable() {
    return getProvider() !== null;
  },

  async analyseComplaint(user: AuthUser, complaintId: string) {
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    const provider = getProvider();
    if (!provider) {
      return {
        available: false,
        provider: env.AI_PROVIDER,
        suggestedCategoryId: null,
        suggestedCategoryName: null,
        suggestedPriority: null,
        summary: null,
        suggestedResponse: null,
        suggestedNextSteps: [],
        similarComplaints: [],
        patternNotes: "AI is unavailable because no provider credentials are configured.",
        confidence: null,
      } satisfies AISuggestion;
    }

    const complaint = await prisma.complaint.findFirst({
      where: scopedWhere(user, { id: complaintId }, "read"),
      include: {
        category: true,
        region: true,
        conversation: { include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } } },
        comments: { where: { visibility: "INTERNAL" }, take: 5, orderBy: { createdAt: "desc" } },
      },
    });
    if (!complaint) throw ApiError.notFound("Complaint not found");

    const categories = await prisma.complaintCategory.findMany({ where: { isActive: true } });
    const tokens = complaint.description.split(/\s+/).filter((w) => w.length > 4).slice(0, 6);
    const similar = await prisma.complaint.findMany({
      where: {
        id: { not: complaint.id },
        regionId: complaint.regionId,
        OR: tokens.length
          ? tokens.map((t) => ({ description: { contains: t, mode: "insensitive" as const } }))
          : [{ categoryId: complaint.categoryId ?? undefined }],
      },
      include: { category: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    let result: Awaited<ReturnType<AIProvider["analyse"]>>;
    try {
      result = await provider.analyse({
        description: complaint.description,
        conversation: [
          ...(complaint.conversation?.messages ?? []).map((m) => `${m.senderType}: ${m.body}`),
          ...complaint.comments.map((c) => `INTERNAL: ${c.comment}`),
        ].join("\n"),
        categories,
        similar: similar.map((s) => ({
          id: s.id,
          complaintNumber: s.complaintNumber,
          description: s.description,
          categoryName: s.category?.name ?? null,
        })),
      });
    } catch {
      throw ApiError.unprocessable("AI analysis failed. Try again later.");
    }

    const saved = await prisma.aIAnalysis.create({
      data: {
        complaintId: complaint.id,
        provider: result.provider,
        suggestedCategoryId: result.suggestedCategoryId,
        suggestedPriority: result.suggestedPriority,
        summary: result.summary,
        suggestedResponse: result.suggestedResponse,
        suggestedNextSteps: result.suggestedNextSteps,
        similarComplaintIds: similar.map((s) => s.id),
        patternNotes: result.patternNotes,
        confidence: result.confidence,
        status: "SUGGESTED",
      },
    });

    return {
      id: saved.id,
      available: true,
      provider: result.provider,
      suggestedCategoryId: result.suggestedCategoryId,
      suggestedCategoryName: result.suggestedCategoryName,
      suggestedPriority: result.suggestedPriority,
      summary: result.summary,
      suggestedResponse: result.suggestedResponse,
      suggestedNextSteps: result.suggestedNextSteps,
      similarComplaints: similar.map((s, i) => ({
        id: s.id,
        complaintNumber: s.complaintNumber,
        similarityNote: result.similarNotes[i] ?? "Text overlap in description",
      })),
      patternNotes: result.patternNotes,
      confidence: result.confidence,
      status: saved.status,
    };
  },

  async review(user: AuthUser, analysisId: string, input: { status: "ACCEPTED" | "EDITED" | "REJECTED"; suggestedCategoryId?: string; suggestedPriority?: string; suggestedResponse?: string }) {
    if (user.role === "CUSTOMER") throw ApiError.forbidden();
    const analysis = await prisma.aIAnalysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw ApiError.notFound("AI analysis not found");
    const updated = await prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        status: input.status,
        suggestedCategoryId: input.suggestedCategoryId ?? analysis.suggestedCategoryId,
        suggestedPriority: input.suggestedPriority ?? analysis.suggestedPriority,
        suggestedResponse: input.suggestedResponse ?? analysis.suggestedResponse,
        reviewedById: user.id,
      },
    });
    if (input.status === "ACCEPTED" && updated.suggestedCategoryId) {
      await prisma.complaint.update({
        where: { id: analysis.complaintId },
        data: {
          categoryId: updated.suggestedCategoryId,
          priority: updated.suggestedPriority ?? undefined,
        },
      });
    }
    return updated;
  },
};
