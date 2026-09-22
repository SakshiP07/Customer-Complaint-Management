import { describe, expect, it } from "vitest";
import { WebsiteChannelAdapter, getChannelAdapter } from "../../src/integrations/channels/adapters.js";

describe("channel adapters", () => {
  it("website adapter normalises a payload", async () => {
    const adapter = new WebsiteChannelAdapter();
    const result = await adapter.ingest({
      name: "Aisha",
      email: "aisha@example.com",
      regionId: "r1",
      categoryId: "c1",
      description: "Billing error on last invoice for store visit.",
    });
    expect(result.channelCode).toBe("WEBSITE");
    expect(result.email).toBe("aisha@example.com");
  });

  it("social adapters are stubs and not live", async () => {
    const ig = getChannelAdapter("INSTAGRAM");
    expect(ig?.live).toBe(false);
    await expect(ig?.ingest({})).rejects.toThrow(/not connected/i);
    expect(getChannelAdapter("WHATSAPP")?.live).toBe(false);
  });
});
