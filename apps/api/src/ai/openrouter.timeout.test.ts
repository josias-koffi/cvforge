import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterRequestError } from "./openrouter.error";
import { isRetryableStatus } from "./openrouter.error";
import {
  CHAT_OPEN_TIMEOUT_MS,
  TRANSCRIPTION_OPEN_TIMEOUT_MS,
  VOICE_OPEN_TIMEOUT_MS,
  fetchWithOpenTimeout,
} from "./openrouter.timeout";

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.useRealTimers();
});

/** A call that answers, so the happy path can be asserted without a network. */
function answering(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** A call that never resolves until its signal aborts — a dead connection. */
function hanging() {
  const fetchMock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("fetchWithOpenTimeout", () => {
  it("returns the response untouched when the headers arrive in time", async () => {
    const response = new Response("ok");
    answering(response);

    await expect(
      fetchWithOpenTimeout("https://example.test", { method: "POST" }, 50),
    ).resolves.toBe(response);
  });

  it("gives up on a connection that never answers", async () => {
    // What staging actually did: 34 seconds on a dead socket, then a retry
    // that answered in 1.3 s. `fetch` alone waits as long as the socket lives.
    hanging();

    await expect(
      fetchWithOpenTimeout("https://example.test", { method: "POST" }, 10),
    ).rejects.toBeInstanceOf(OpenRouterRequestError);
  });

  it("reports the timeout as a status the chain already retries", async () => {
    hanging();

    const error = await fetchWithOpenTimeout(
      "https://example.test",
      { method: "POST" },
      10,
      "openai/gpt-audio-mini",
    ).catch((caught: unknown) => caught as OpenRouterRequestError);

    expect(error.status).toBe(408);
    expect(isRetryableStatus(error.status)).toBe(true);
  });

  it("names the model that hung, so the log line is actionable", async () => {
    hanging();

    await expect(
      fetchWithOpenTimeout(
        "https://example.test",
        { method: "POST" },
        10,
        "openai/gpt-audio-mini",
      ),
    ).rejects.toThrow(/openai\/gpt-audio-mini/);
  });

  it("passes a failure that is not a timeout straight through", async () => {
    const boom = new TypeError("socket reset");
    globalThis.fetch = vi.fn().mockRejectedValue(boom) as unknown as typeof fetch;

    await expect(
      fetchWithOpenTimeout("https://example.test", { method: "POST" }, 50),
    ).rejects.toBe(boom);
  });

  it("stops the clock once the headers are in, so a long body is never cut", async () => {
    // The distinction the whole module exists for: a voice reply streams audio
    // for far longer than the budget for opening the call, and an
    // `AbortSignal.timeout` would abort it mid-sentence.
    let abortedDuringBody = false;
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      init.signal?.addEventListener("abort", () => {
        abortedDuringBody = true;
      });
      return Promise.resolve(new Response("frames"));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchWithOpenTimeout("https://example.test", { method: "POST" }, 5);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(abortedDuringBody).toBe(false);
  });

  it("budgets the voice turn far tighter than the calls nobody waits on", () => {
    // A spoken turn is perceived in about a second; the report is not.
    expect(VOICE_OPEN_TIMEOUT_MS).toBeLessThan(TRANSCRIPTION_OPEN_TIMEOUT_MS);
    expect(TRANSCRIPTION_OPEN_TIMEOUT_MS).toBeLessThan(CHAT_OPEN_TIMEOUT_MS);
  });
});
