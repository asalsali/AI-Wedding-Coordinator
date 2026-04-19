import Anthropic from "@anthropic-ai/sdk";
import { generateReply } from "./reply";
import type { WeddingProfile } from "@/types";

jest.mock("@anthropic-ai/sdk");

const mockCreate = jest.fn();
const mockClient = {
  messages: { create: mockCreate },
} as unknown as Anthropic;

const mockProfile: WeddingProfile = {
  id: "test-profile",
  couple_id: "test-couple",
  venue_name: "The Grand Hall",
  venue_address: "123 Elm St, Springfield",
  ceremony_time: "2026-07-15T16:00:00Z",
  reception_time: "2026-07-15T18:00:00Z",
  dress_code: "black tie",
  registry_links: ["https://example.com/registry"],
  hotel_block: null,
  parking_info: null,
  tone: "warm",
  vibe_word: "romantic",
  sample_message: null,
  readiness_score: 80,
  faqs: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("generateReply", () => {
  it("returns trimmed reply text on success", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "  The ceremony starts at 4 PM!  " }],
    });
    const result = await generateReply(
      "What time does the ceremony start?",
      mockProfile,
      mockClient
    );
    expect(result).toBe("The ceremony starts at 4 PM!");
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        temperature: 0.7,
      })
    );
  });

  it("throws when response block is not a text block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "abc", name: "fn", input: {} }],
    });
    await expect(
      generateReply("What time?", mockProfile, mockClient)
    ).rejects.toThrow("Reply generator AI call failed: Unexpected non-text response from reply generator");
  });

  it("throws when reply is an empty string after trim", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "   " }],
    });
    await expect(
      generateReply("What time?", mockProfile, mockClient)
    ).rejects.toThrow("Reply generator returned an empty response");
  });

  it("throws when AI call itself fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));
    await expect(
      generateReply("What time?", mockProfile, mockClient)
    ).rejects.toThrow("Reply generator AI call failed: API rate limit exceeded");
  });

  it("passes system prompt derived from profile", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Black tie, please!" }],
    });
    await generateReply("What is the dress code?", mockProfile, mockClient);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("The Grand Hall");
    expect(callArgs.system).toContain("black tie");
  });
});
