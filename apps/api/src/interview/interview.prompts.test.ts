import { interviewRecruiterProfiles, type InterviewMessage } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  buildAiPrompt,
  buildConversation,
  resolveLanguageLabel,
} from "./interview.prompts";
import { MAX_MESSAGES } from "./interview.stats";

const message = (content: string): InterviewMessage => ({
  role: "user",
  content,
  timestamp: "2026-04-24T13:00:00.000Z",
});

describe("resolveLanguageLabel", () => {
  it("names each supported language", () => {
    expect(resolveLanguageLabel("fr")).toBe("French");
    expect(resolveLanguageLabel("en")).toBe("English");
  });

  it("falls back to French rather than returning undefined mid-interview", () => {
    expect(resolveLanguageLabel("de" as "fr")).toBe("French");
  });
});

describe("buildAiPrompt", () => {
  it("gives every profile its own instruction, in both languages", () => {
    const prompts = new Set<string>();

    for (const profile of interviewRecruiterProfiles) {
      for (const language of ["fr", "en"] as const) {
        const prompt = buildAiPrompt(language, profile);

        expect(prompt.length).toBeGreaterThan(0);
        prompts.add(prompt);
      }
    }

    // 5 profiles x 2 languages, all distinct.
    expect(prompts.size).toBe(interviewRecruiterProfiles.length * 2);
  });

  it("answers in the requested language", () => {
    expect(buildAiPrompt("fr", "standard")).toContain("francais");
    expect(buildAiPrompt("en", "standard")).toContain("English");
  });

  it("falls back to the standard profile on an unknown one", () => {
    const unknown = buildAiPrompt("fr", "chaotic" as "standard");

    expect(unknown).toBe(buildAiPrompt("fr", "standard"));
  });
});

describe("buildConversation", () => {
  it("leads with the system prompt and keeps the turns in order", () => {
    const conversation = buildConversation("fr", "technical", [
      message("premier"),
      message("second"),
    ]);

    expect(conversation[0]?.role).toBe("system");
    expect(conversation.map((entry) => entry.content).slice(1)).toEqual([
      "premier",
      "second",
    ]);
  });

  it("keeps only the most recent turns, so the context stays within budget", () => {
    const messages = Array.from({ length: MAX_MESSAGES + 5 }, (_, i) =>
      message(`m${i}`),
    );

    const conversation = buildConversation("fr", "standard", messages);

    // The system prompt plus the window.
    expect(conversation).toHaveLength(MAX_MESSAGES + 1);
    expect(conversation.at(-1)?.content).toBe(`m${MAX_MESSAGES + 4}`);
    expect(conversation.at(1)?.content).toBe("m5");
  });
});
