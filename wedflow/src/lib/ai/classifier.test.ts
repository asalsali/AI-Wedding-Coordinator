import Anthropic from "@anthropic-ai/sdk";
import {
  classifyMessage,
  shouldEscalate,
  CONFIDENCE_THRESHOLD,
  ClassificationResult,
} from "./classifier";

// ----------------------------------------------------------------
// Mock Anthropic SDK
// ----------------------------------------------------------------

jest.mock("@anthropic-ai/sdk");

const mockCreate = jest.fn();
const mockClient = {
  messages: { create: mockCreate },
} as unknown as Anthropic;

function mockAIResponse(classification: string, confidence: number, reason: string) {
  mockCreate.mockResolvedValueOnce({
    content: [
      {
        type: "text",
        text: JSON.stringify({ classification, confidence, reason }),
      },
    ],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ----------------------------------------------------------------
// Hard rule tests — AI should NOT be called for these
// ----------------------------------------------------------------

describe("Hard rule: always sensitive patterns", () => {
  it("classifies cancer mention as sensitive without calling AI", async () => {
    const result = await classifyMessage(
      "Hi, I have to let you know I was diagnosed with cancer last week",
      mockClient
    );
    expect(result.classification).toBe("sensitive");
    expect(result.confidence).toBe(1.0);
    expect(result.triggeredHardRule).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("classifies death/grief mention as sensitive without calling AI", async () => {
    const result = await classifyMessage(
      "My dad passed away last month, just wanted you to know",
      mockClient
    );
    expect(result.classification).toBe("sensitive");
    expect(result.triggeredHardRule).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("classifies 'can't make it' as sensitive without calling AI", async () => {
    const result = await classifyMessage(
      "I'm so sorry but I can't make it to the wedding",
      mockClient
    );
    expect(result.classification).toBe("sensitive");
    expect(result.triggeredHardRule).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("classifies pregnancy announcement as sensitive without calling AI", async () => {
    const result = await classifyMessage(
      "Exciting news — I'm expecting! Due date is next month",
      mockClient
    );
    expect(result.classification).toBe("sensitive");
    expect(result.triggeredHardRule).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("is case-insensitive for hard rules", async () => {
    const result = await classifyMessage("I WAS DIAGNOSED last week", mockClient);
    expect(result.classification).toBe("sensitive");
    expect(result.triggeredHardRule).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// Routine message tests
// ----------------------------------------------------------------

describe("Routine messages", () => {
  it("classifies dress code question as routine", async () => {
    mockAIResponse("routine", 0.97, "Clear logistical question about dress code");
    const result = await classifyMessage("What should I wear to the wedding?", mockClient);
    expect(result.classification).toBe("routine");
    expect(result.triggeredHardRule).toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("classifies time question as routine", async () => {
    mockAIResponse("routine", 0.99, "Simple factual question about schedule");
    const result = await classifyMessage("What time does the ceremony start?", mockClient);
    expect(result.classification).toBe("routine");
  });

  it("classifies registry question as routine", async () => {
    mockAIResponse("routine", 0.95, "Logistical question about gift registry");
    const result = await classifyMessage("Where are you registered?", mockClient);
    expect(result.classification).toBe("routine");
  });

  it("classifies parking question as routine", async () => {
    mockAIResponse("routine", 0.96, "Logistical question about parking");
    const result = await classifyMessage("Is there parking at the venue?", mockClient);
    expect(result.classification).toBe("routine");
  });
});

// ----------------------------------------------------------------
// AI-detected sensitive tests
// ----------------------------------------------------------------

describe("AI-detected sensitive messages", () => {
  it("classifies emotional message detected by AI as sensitive", async () => {
    mockAIResponse("sensitive", 0.92, "Message contains personal and emotional context");
    const result = await classifyMessage(
      "I just wanted to say how much this means to me after everything we've been through",
      mockClient
    );
    expect(result.classification).toBe("sensitive");
    expect(result.triggeredHardRule).toBe(false);
  });
});

// ----------------------------------------------------------------
// Unclear messages
// ----------------------------------------------------------------

describe("Unclear messages", () => {
  it("classifies plus-one question with high confidence as unclear", async () => {
    mockAIResponse("unclear", 0.82, "Plus-one requests have logistical implications");
    const result = await classifyMessage(
      "Is it okay if I bring my partner? We just started dating",
      mockClient
    );
    expect(result.classification).toBe("unclear");
  });

  it("classifies ambiguous message with low confidence — should escalate", async () => {
    mockAIResponse("unclear", 0.55, "Cannot determine intent with confidence");
    const result = await classifyMessage("About the weekend — is it still on?", mockClient);
    expect(result.classification).toBe("unclear");
    expect(shouldEscalate(result)).toBe(true);
  });

  it("does not escalate unclear message with high confidence", async () => {
    mockAIResponse("unclear", 0.88, "Slightly ambiguous but likely logistical");
    const result = await classifyMessage(
      "Can I bring a small gift or is there a registry?",
      mockClient
    );
    expect(result.classification).toBe("unclear");
    expect(shouldEscalate(result)).toBe(false);
  });
});

// ----------------------------------------------------------------
// Error handling
// ----------------------------------------------------------------

describe("Error handling", () => {
  it("throws on empty message", async () => {
    await expect(classifyMessage("", mockClient)).rejects.toThrow(
      "Cannot classify an empty message"
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws on whitespace-only message", async () => {
    await expect(classifyMessage("   ", mockClient)).rejects.toThrow(
      "Cannot classify an empty message"
    );
  });

  it("throws when AI returns malformed JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Sure! This message is routine." }],
    });
    await expect(
      classifyMessage("What time does it start?", mockClient)
    ).rejects.toThrow("Classifier returned malformed JSON");
  });

  it("throws when AI returns invalid classification value", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({ classification: "maybe", confidence: 0.7, reason: "hmm" }),
        },
      ],
    });
    await expect(
      classifyMessage("What time does it start?", mockClient)
    ).rejects.toThrow("Classifier response failed validation");
  });

  it("throws when AI returns confidence out of range", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({ classification: "routine", confidence: 1.5, reason: "fine" }),
        },
      ],
    });
    await expect(
      classifyMessage("What time does it start?", mockClient)
    ).rejects.toThrow("Classifier response failed validation");
  });

  it("throws when AI call itself fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network timeout"));
    await expect(
      classifyMessage("What time does it start?", mockClient)
    ).rejects.toThrow("Classifier AI call failed: Network timeout");
  });
});

// ----------------------------------------------------------------
// shouldEscalate helper
// ----------------------------------------------------------------

describe("shouldEscalate", () => {
  it("escalates all sensitive messages", () => {
    const result: ClassificationResult = {
      classification: "sensitive",
      confidence: 0.99,
      reason: "test",
      triggeredHardRule: false,
    };
    expect(shouldEscalate(result)).toBe(true);
  });

  it("escalates unclear messages below confidence threshold", () => {
    const result: ClassificationResult = {
      classification: "unclear",
      confidence: CONFIDENCE_THRESHOLD - 0.01,
      reason: "test",
      triggeredHardRule: false,
    };
    expect(shouldEscalate(result)).toBe(true);
  });

  it("does not escalate unclear messages at or above confidence threshold", () => {
    const result: ClassificationResult = {
      classification: "unclear",
      confidence: CONFIDENCE_THRESHOLD,
      reason: "test",
      triggeredHardRule: false,
    };
    expect(shouldEscalate(result)).toBe(false);
  });

  it("does not escalate routine messages", () => {
    const result: ClassificationResult = {
      classification: "routine",
      confidence: 0.95,
      reason: "test",
      triggeredHardRule: false,
    };
    expect(shouldEscalate(result)).toBe(false);
  });
});
