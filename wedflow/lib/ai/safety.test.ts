import { checkReplySafety } from "./safety";
import type { WeddingProfile } from "@/types";

const baseProfile: WeddingProfile = {
  id: "test-profile",
  couple_id: "test-couple",
  venue_name: "Willow & REN",
  venue_address: "1183 Side Rd 25, Ripley, ON N0G 2R0",
  ceremony_time: "2026-07-24T15:30:00Z",
  reception_time: "2026-07-24T18:00:00Z",
  dress_code: "garden formal",
  registry_links: [
    "https://registry.example.com/alex-kirsten",
    "https://honeyfund.example.com/willow",
  ],
  hotel_block: "Best Western Ripley, code WEDDING2026",
  parking_info: "Free parking in Lot C, east of main entrance",
  tone: "warm",
  vibe_word: "intimate",
  sample_message: "We can't wait to celebrate with you!",
  readiness_score: 100,
  faqs: [
    { id: "1", question: "Is there a shuttle?", answer: "Yes, from Best Western at 2:30 PM.", display_order: 1 },
  ],
};

describe("checkReplySafety", () => {
  // ── Pass cases ──

  it("passes when reply matches profile facts", () => {
    const reply = "The ceremony begins at 3:30 pm at Willow & REN. Garden formal attire!";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });

  it("passes when reply contains no verifiable facts", () => {
    const reply = "We're so glad you're coming! It's going to be a beautiful day.";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });

  it("passes when reply contains a matching registry URL", () => {
    const reply = "You can find our registry at https://registry.example.com/alex-kirsten";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });

  it("passes when time appears in various formats", () => {
    expect(checkReplySafety("Ceremony at 3:30pm", baseProfile)).toBe(true);
    expect(checkReplySafety("Ceremony at 3:30 pm", baseProfile)).toBe(true);
    expect(checkReplySafety("Ceremony at 15:30", baseProfile)).toBe(true);
  });

  it("passes when reply mentions a matching address", () => {
    const reply = "We're at 1183 Side Rd 25 in Ripley!";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });

  it("blocks when reply includes a time from FAQ but not from ceremony/reception", () => {
    // The FAQ mentions 2:30 PM shuttle, but the safety checker validates
    // time patterns against ceremony_time and reception_time only.
    // This is conservative by design: FAQ times are not in the time variant set.
    const reply = "Yes, there's a shuttle from Best Western at 2:30 PM.";
    expect(checkReplySafety(reply, baseProfile)).toBe(false);
  });

  it("passes when reply references FAQ content without extracted time patterns", () => {
    const reply = "Yes, there's a shuttle from Best Western!";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });

  // ── Block cases ──

  it("blocks when reply contains an invented URL", () => {
    const reply = "Check out our registry at https://fake-registry.com/not-real";
    expect(checkReplySafety(reply, baseProfile)).toBe(false);
  });

  it("blocks when reply contains a wrong time", () => {
    const reply = "The ceremony starts at 4:00 pm.";
    expect(checkReplySafety(reply, baseProfile)).toBe(false);
  });

  it("blocks when reply contains an invented address", () => {
    const reply = "The venue is at 999 Fake Blvd downtown.";
    expect(checkReplySafety(reply, baseProfile)).toBe(false);
  });

  it("blocks when reply invents a dress code", () => {
    const reply = "The dress code is black tie optional.";
    expect(checkReplySafety(reply, baseProfile)).toBe(false);
  });

  it("blocks when reply uses a dress code not in the profile", () => {
    const reply = "Cocktail attire is perfect for the evening.";
    expect(checkReplySafety(reply, baseProfile)).toBe(false);
  });

  it("blocks empty reply", () => {
    expect(checkReplySafety("", baseProfile)).toBe(false);
  });

  it("blocks whitespace-only reply", () => {
    expect(checkReplySafety("   \n  ", baseProfile)).toBe(false);
  });

  // ── Edge cases ──

  it("handles profile with no registry links", () => {
    const profile = { ...baseProfile, registry_links: null as unknown as string[] };
    const reply = "We don't have a registry set up yet!";
    expect(checkReplySafety(reply, profile)).toBe(true);
  });

  it("handles profile with no ceremony or reception time", () => {
    const profile = { ...baseProfile, ceremony_time: null as unknown as string, reception_time: null as unknown as string };
    const reply = "We'll share the time details soon!";
    expect(checkReplySafety(reply, profile)).toBe(true);
  });

  it("blocks URL in reply even when profile has no registry links", () => {
    const profile = { ...baseProfile, registry_links: [] };
    const reply = "Check https://random-site.com for details.";
    expect(checkReplySafety(reply, profile)).toBe(false);
  });

  it("passes when dress code term matches profile exactly", () => {
    const profile = { ...baseProfile, dress_code: "semi-formal" };
    const reply = "The dress code is semi-formal.";
    expect(checkReplySafety(reply, profile)).toBe(true);
  });

  it("is case-insensitive for time matching", () => {
    const reply = "Ceremony at 3:30 PM";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });

  it("handles reception time correctly", () => {
    const reply = "Reception starts at 6 pm!";
    expect(checkReplySafety(reply, baseProfile)).toBe(true);
  });
});
