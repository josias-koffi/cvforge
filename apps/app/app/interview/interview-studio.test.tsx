// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InterviewStudio } from "./interview-studio";

class FakeAudioBuffer {
  sampleRate = 48000;
  getChannelData() {
    return new Float32Array([0.1, -0.1, 0.2]);
  }
}

class FakeAnalyser {
  fftSize = 256;
  get frequencyBinCount() { return this.fftSize / 2; }
  getByteFrequencyData(arr: Uint8Array) { arr.fill(0); }
  disconnect() {}
}

class FakeMediaStreamSource {
  connect() {}
}

class FakeAudioContext {
  async decodeAudioData() {
    return new FakeAudioBuffer();
  }
  async close() {}
  createAnalyser() { return new FakeAnalyser(); }
  createMediaStreamSource() { return new FakeMediaStreamSource(); }
}

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }

  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstart: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  state: RecordingState = "inactive";

  constructor(
    readonly _stream: MediaStream,
    readonly options?: MediaRecorderOptions,
  ) {}

  start() {
    this.state = "recording";
    this.onstart?.(new Event("start"));
    queueMicrotask(() => {
      this.ondataavailable?.({
        data: new Blob(["audio"], {
          type: this.options?.mimeType ?? "audio/webm",
        }),
      } as BlobEvent);
    });
  }

  stop() {
    if (this.state !== "recording") {
      throw new DOMException("Recorder is inactive", "InvalidStateError");
    }
    this.state = "inactive";
    this.onstop?.(new Event("stop"));
  }
}

function readWavSampleRate(base64: string) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new DataView(bytes.buffer).getUint32(24, true);
}

describe("InterviewStudio", () => {
  let container: HTMLDivElement;
  let root: Root;
  const fetchMock = vi.fn();
  const stopTrack = vi.fn();

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("requestAnimationFrame", (_cb: FrameRequestCallback) => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });
    window.sessionStorage.clear();
    fetchMock.mockReset();
    stopTrack.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    vi.unstubAllGlobals();
  });

  it("accumulates blobs and uploads a WAV chunk when the user stops recording", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          session: {
            aiResponse: null,
            aiResponseGeneratedAt: null,
            aiStatus: "idle",
            chunks: [],
            completedAt: null,
            createdAt: "2026-04-24T13:00:00.000Z",
            id: "session-001",
            language: "fr",
            lastError: null,
            profile: "standard",
            recoverable: true,
            status: "idle",
            transcript: "",
            updatedAt: "2026-04-24T13:00:00.000Z",
          },
          sessionId: "session-001",
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          aiResponse: null,
          aiResponseGeneratedAt: null,
          aiStatus: "idle",
          chunks: [
            {
              chunkId: "session-001-chunk-1",
              createdAt: "2026-04-24T13:00:00.500Z",
              endedAt: "2026-04-24T13:00:00.500Z",
              errorMessage: null,
              isFinal: true,
              mimeType: "audio/wav",
              sequence: 1,
              startedAt: "2026-04-24T13:00:00.000Z",
              status: "transcribed",
              transcript: "bonjour",
            },
          ],
          completedAt: null,
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-001",
          language: "fr",
          lastError: null,
          profile: "standard",
          recoverable: true,
          status: "ready",
          transcript: "bonjour",
          updatedAt: "2026-04-24T13:00:00.500Z",
        }),
        ok: true,
      });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
    });

    // Click "Demarrer l'entretien"
    await act(async () => {
      container.querySelector("button")?.click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    // Click "Arreter" — triggers onstop → WAV conversion → upload
    await act(async () => {
      const buttons = [...container.querySelectorAll("button")];
      const stopBtn = buttons.find((b) => b.textContent?.includes("Arreter"));
      stopBtn?.click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/interview/start",
      expect.objectContaining({
        body: JSON.stringify({ language: "fr", profile: "standard" }),
        method: "POST",
      }),
    );
    const [chunkUrl, chunkInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(chunkUrl).toBe("/interview/session-001/chunk");
    expect(chunkInit.method).toBe("POST");
    const body = JSON.parse(chunkInit.body as string) as { format: string; isFinal: boolean };
    expect(body.format).toBe("wav");
    expect(body.isFinal).toBe(true);
    expect(
      readWavSampleRate((body as { chunkBase64: string }).chunkBase64),
    ).toBe(16000);
    expect(container.textContent).toContain("bonjour");
  });

  it("ignores repeated stop actions after the recorder has already stopped", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          session: {
            aiResponse: null,
            aiResponseGeneratedAt: null,
            aiStatus: "idle",
            chunks: [],
            completedAt: null,
            createdAt: "2026-04-24T13:00:00.000Z",
            id: "session-003",
            language: "fr",
            lastError: null,
            profile: "standard",
            recoverable: true,
            status: "idle",
            transcript: "",
            updatedAt: "2026-04-24T13:00:00.000Z",
          },
          sessionId: "session-003",
        }),
        ok: true,
      })
      .mockResolvedValue({
        json: async () => ({
          aiResponse: null,
          aiResponseGeneratedAt: null,
          aiStatus: "idle",
          chunks: [],
          completedAt: null,
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-003",
          language: "fr",
          lastError: null,
          profile: "standard",
          recoverable: true,
          status: "ready",
          transcript: "",
          updatedAt: "2026-04-24T13:00:00.500Z",
        }),
        ok: true,
      });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
    });

    await act(async () => {
      container.querySelector("button")?.click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      const stopBtn = [...container.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Arreter"),
      );
      stopBtn?.click();
      stopBtn?.click();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.textContent).not.toContain("deja ete arretee");
  });

  it("rehydrates a saved session from sessionStorage", async () => {
    window.sessionStorage.setItem(
      "cvforge-interview-session:user@example.com",
      "session-002",
    );
    fetchMock.mockResolvedValue({
      json: async () => ({
        aiResponse: null,
        aiResponseGeneratedAt: null,
        aiStatus: "idle",
        chunks: [],
        completedAt: null,
        createdAt: "2026-04-24T13:00:00.000Z",
        id: "session-002",
        language: "fr",
        lastError: null,
        profile: "standard",
        recoverable: true,
        status: "ready",
        transcript: "transcription hydratee",
        updatedAt: "2026-04-24T13:05:00.000Z",
      }),
      ok: true,
    });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/interview/session-002", {
      cache: "no-store",
    });
    expect(container.textContent).toContain("transcription hydratee");
  });

  it("lets the user choose English before starting the session", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        session: {
          aiResponse: null,
          aiResponseGeneratedAt: null,
          aiStatus: "idle",
          chunks: [],
          completedAt: null,
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-004",
          language: "en",
          lastError: null,
          profile: "standard",
          recoverable: true,
          status: "idle",
          transcript: "",
          updatedAt: "2026-04-24T13:00:00.000Z",
        },
        sessionId: "session-004",
      }),
      ok: true,
    });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
    });

    await act(async () => {
      const select = container.querySelector("select[aria-label=\"Langue de l'entretien\"]") as HTMLSelectElement | null;
      if (!select) {
        throw new Error("Language select not found");
      }
      select.value = "en";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      container.querySelector("button")?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/interview/start",
      expect.objectContaining({
        body: JSON.stringify({ language: "en", profile: "standard" }),
      }),
    );
  });

  it("lets the user choose a recruiter profile before starting the session", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        session: {
          aiResponse: null,
          aiResponseGeneratedAt: null,
          aiStatus: "idle",
          chunks: [],
          completedAt: null,
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-005",
          language: "fr",
          lastError: null,
          profile: "technical",
          recoverable: true,
          status: "idle",
          transcript: "",
          updatedAt: "2026-04-24T13:00:00.000Z",
        },
        sessionId: "session-005",
      }),
      ok: true,
    });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
    });

    await act(async () => {
      const select = container.querySelector(
        "select[aria-label=\"Profil du recruteur\"]",
      ) as HTMLSelectElement | null;
      if (!select) {
        throw new Error("Profile select not found");
      }
      select.value = "technical";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      container.querySelector("button")?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/interview/start",
      expect.objectContaining({
        body: JSON.stringify({ language: "fr", profile: "technical" }),
      }),
    );
    expect(container.textContent).toContain("Technique");
  });

  it("finishes a session cleanly and clears the persisted session id", async () => {
    window.sessionStorage.setItem(
      "cvforge-interview-session:user@example.com",
      "session-006",
    );

    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          aiResponse: null,
          aiResponseGeneratedAt: null,
          aiStatus: "done",
          chunks: [],
          completedAt: null,
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-006",
          language: "fr",
          lastError: null,
          profile: "standard",
          recoverable: true,
          status: "ready",
          transcript: "transcription hydratee",
          updatedAt: "2026-04-24T13:05:00.000Z",
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          aiResponse: "Merci pour cet entretien.",
          aiResponseGeneratedAt: "2026-04-24T13:10:00.000Z",
          aiStatus: "done",
          chunks: [],
          completedAt: "2026-04-24T13:12:00.000Z",
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-006",
          language: "fr",
          lastError: null,
          profile: "standard",
          recoverable: false,
          status: "completed",
          transcript: "transcription hydratee",
          updatedAt: "2026-04-24T13:12:00.000Z",
        }),
        ok: true,
      });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
      await Promise.resolve();
    });

    await act(async () => {
      const finishBtn = [...container.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Terminer la session"),
      );
      finishBtn?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/interview/session-006/finish",
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      window.sessionStorage.getItem("cvforge-interview-session:user@example.com"),
    ).toBeNull();
    expect(container.textContent).toContain("Session terminee proprement");
  });
});
