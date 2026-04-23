import Anthropic from "@anthropic-ai/sdk";
import { draftEscalationReply } from "./escalation";
import type { WeddingProfile } from "@/types";

jest.mock("@anthropic-ai/sdk");

const mockCreate = jest.fn();
const mockClient = {
  messages: { create: mockCreate },
} as unknown as Anthropic;

const mockProfile: WeddingProfile = {
  id: "test-profile",
  couple_id: "test-couple",
  venue_name: "Willow & REN",
  venue_address: "1183 Side Rd 25, Ripley, ON N0G 2R0",
  ceremony_time: "2026-07-24T15:30:00Z",
  reception_time: "2026-07-24T18:00:00Z",
  dress_code: "garden formal",
  registry_links: ["https://registry.example.com/alex-kirsten"],
  hotel_block: "Best Western Ripley",
  parking_info: "Free parking in Lot C",
  tone: "warm",
  vibe_word: "intimate",
  sample_message: "We can't wait to celebrate with you!",
  readiness_score: 100,
  faqs: [
    { id: "1", question: "Is there a shuttle?", answer: "Yes, from Best Western at 2:30 PM.", display_order: 1 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("draftEscalationReply", () => {
  it("returns trimmed draft text on success", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "  Thank you so much for sharing that with us. Your health matters to us deeply.  " }],
    });
    const result = await draftEscalationReply(
      "I have severe allergies",
      mockProfile,
      mockClient
    );
    expect(result).toBe("Thank you so much for sharing that with us. Your health matters to us deeply.");
  });

  it("uses claude-opus-4-6 with correct parameters", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Draft reply here." }],
    });
    await draftEscalationReply("I can't make it", mockProfile, mockClient);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-4-6",
        max_tokens: 300,
        temperature: 0.6,
      })
    );
  });

  it("includes profile context in the user message", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Draft." }],
    });
    await draftEscalationReply("I'm so sorry", mockProfile, mockClient);
    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content;
    expect(userMessage).toContain("Willow & REN");
    expect(userMessage).toContain("warm");
    expect(userMessage).toContain("I'm so sorry");
  });

  it("includes FAQ content in profile context", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Draft." }],
    });
    await draftEscalationReply("shuttle question", mockProfile, mockClient);
    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content;
    expect(userMessage).toContain("shuttle");
    expect(userMessage).toContain("Best Western");
  });

  it("throws when response block is not text", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "abc", name: "fn", input: {} }],
    });
    await expect(
      draftEscalationReply("I can't make it", mockProfile, mockClient)
    ).rejects.toThrow("Escalation drafter AI call failed: Unexpected non-text response from escalation drafter");
  });

  it("throws when draft is empty after trim", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "   " }],
    });
    await expect(
      draftEscalationReply("I can't make it", mockProfile, mockClient)
    ).rejects.toThrow("Escalation drafter returned an empty response");
  });

  it("throws when AI call fails with API error", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));
    await expect(
      draftEscalationReply("I can't make it", mockProfile, mockClient)
    ).rejects.toThrow("Escalation drafter AI call failed: API rate limit exceeded");
  });

  it("throws when AI call fails with non-Error", async () => {
    mockCreate.mockRejectedValueOnce("network timeout");
    await expect(
      draftEscalationReply("I can't make it", mockProfile, mockClient)
    ).rejects.toThrow("Escalation drafter AI call failed: network timeout");
  });

  it("handles profile with minimal data", async () => {
    const minimalProfile: WeddingProfile = {
      id: "min",
      couple_id: "min-couple",
      venue_name: null as unknown as string,
      venue_address: null as unknown as string,
      ceremony_time: null as unknown as string,
      reception_time: null as unknown as string,
      dress_code: null as unknown as string,
      registry_links: [],
      hotel_block: null,
      parking_info: null,
      tone: "warm",
      vibe_word: null,
      sample_message: null,
      readiness_score: 20,
      faqs: [],
    };
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "We hear you and we care." }],
    });
    const result = await draftEscalationReply("I'm struggling", minimalProfile, mockClient);
    expect(result).toBe("We hear you and we care.");
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("I'm struggling");
  });
});
