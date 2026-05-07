// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InterviewStudio } from "./interview-studio";

const APPLICATIONS = [
  {
    companyName: "Acme",
    id: "app-001",
    status: "interview_scheduled",
    title: "Product Engineer",
  },
];

class FakeAudioBuffer {
  sampleRate = 48000;
  getChannelData() {
    return new Float32Array([0.1, -0.1, 0.2]);
  }
}

let fakeAnalyserLevel = 0;

class FakeAnalyser {
  fftSize = 256;
  get frequencyBinCount() { return this.fftSize / 2; }
  getByteFrequencyData(arr: Uint8Array) { arr.fill(fakeAnalyserLevel); }
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

// Controlled RAF: store callbacks and drive them manually
const rafCallbacks = new Map<number, FrameRequestCallback>();
let rafIdCounter = 0;

function stubRaf() {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = ++rafIdCounter;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });
}

async function runVadFrames(count: number, level: number) {
  fakeAnalyserLevel = level;
  for (let i = 0; i < count; i++) {
    const cbs = [...rafCallbacks.values()];
    rafCallbacks.clear();
    for (const cb of cbs) cb(performance.now());
    await Promise.resolve();
  }
}

function readWavSampleRate(base64: string) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new DataView(bytes.buffer).getUint32(24, true);
}

function makeSessionSummary(overrides: Record<string, unknown> = {}) {
  return {
    aiResponse: null,
    aiResponseGeneratedAt: null,
    aiStatus: "idle",
    applicationId: null,
    chunks: [],
    completedAt: null,
    createdAt: "2026-05-07T10:00:00.000Z",
    id: "session-001",
    language: "fr",
    lastError: null,
    prefetchedQuestion: null,
    profile: "standard",
    recoverable: true,
    report: null,
    status: "idle",
    transcript: "",
    updatedAt: "2026-05-07T10:00:00.000Z",
    ...overrides,
  };
}

describe("InterviewStudio", () => {
  let container: HTMLDivElement;
  let root: Root;
  const fetchMock = vi.fn();
  const stopTrack = vi.fn();

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    fakeAnalyserLevel = 0;
    rafCallbacks.clear();
    rafIdCounter = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("AudioContext", FakeAudioContext);
    stubRaf();
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

  // ── Legacy (non-preloadedSessionId) flow ────────────────────────────────

  it("accumulates blobs and uploads a WAV chunk when the user stops recording", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          session: makeSessionSummary({ id: "session-001", status: "idle" }),
          sessionId: "session-001",
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () =>
          makeSessionSummary({
            chunks: [
              {
                chunkId: "session-001-chunk-1",
                createdAt: "2026-05-07T10:00:00.500Z",
                endedAt: "2026-05-07T10:00:00.500Z",
                errorMessage: null,
                isFinal: true,
                mimeType: "audio/wav",
                sequence: 1,
                startedAt: "2026-05-07T10:00:00.000Z",
                status: "transcribed",
                transcript: "bonjour",
              },
            ],
            id: "session-001",
            status: "ready",
            transcript: "bonjour",
          }),
        ok: true,
      });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          sessionEmail="user@example.com"
        />,
      );
    });

    // Click "Demarrer l'entretien" (legacy mode — no preloadedSessionId)
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
        body: JSON.stringify({
          applicationId: "app-001",
          language: "fr",
          profile: "standard",
        }),
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
          session: makeSessionSummary({ id: "session-003", status: "idle" }),
          sessionId: "session-003",
        }),
        ok: true,
      })
      .mockResolvedValue({
        json: async () => makeSessionSummary({ id: "session-003", status: "ready" }),
        ok: true,
      });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          sessionEmail="user@example.com"
        />,
      );
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
      json: async () =>
        makeSessionSummary({
          chunks: [],
          id: "session-002",
          status: "ready",
          transcript: "transcription hydratee",
        }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/interview/session-002/session", {
      cache: "no-store",
    });
    expect(container.textContent).toContain("transcription hydratee");
  });

  it("lets the user choose English before starting the session", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        session: makeSessionSummary({ id: "session-004", language: "en", status: "idle" }),
        sessionId: "session-004",
      }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          sessionEmail="user@example.com"
        />,
      );
    });

    await act(async () => {
      const select = container.querySelector("select[aria-label=\"Langue de l'entretien\"]") as HTMLSelectElement | null;
      if (!select) throw new Error("Language select not found");
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
        body: JSON.stringify({
          applicationId: "app-001",
          language: "en",
          profile: "standard",
        }),
      }),
    );
  });

  it("lets the user choose a recruiter profile before starting the session", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        session: makeSessionSummary({ id: "session-005", profile: "technical", status: "idle" }),
        sessionId: "session-005",
      }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          sessionEmail="user@example.com"
        />,
      );
    });

    await act(async () => {
      const select = container.querySelector(
        "select[aria-label=\"Profil du recruteur\"]",
      ) as HTMLSelectElement | null;
      if (!select) throw new Error("Profile select not found");
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
        body: JSON.stringify({
          applicationId: "app-001",
          language: "fr",
          profile: "technical",
        }),
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
        json: async () =>
          makeSessionSummary({
            aiStatus: "done",
            id: "session-006",
            status: "ready",
            transcript: "transcription hydratee",
          }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () =>
          makeSessionSummary({
            aiResponse: "Merci pour cet entretien.",
            aiResponseGeneratedAt: "2026-05-07T10:10:00.000Z",
            aiStatus: "done",
            completedAt: "2026-05-07T10:12:00.000Z",
            id: "session-006",
            recoverable: false,
            status: "completed",
            transcript: "transcription hydratee",
          }),
        ok: true,
      });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          sessionEmail="user@example.com"
        />,
      );
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

  // ── Auto-VAD (preloadedSessionId) flow ───────────────────────────────────

  it("auto-initializes mic when preloadedSessionId is provided", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-001", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-001"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it("renders the four VAD status badges in auto-VAD mode", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-002", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-002"
          sessionEmail="user@example.com"
        />,
        );
      await Promise.resolve();
    });

    // Default state after init is "listening"
    expect(container.textContent).toContain("À l'écoute");
  });

  it("shows the session timer in auto-VAD mode", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-003", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-003"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
    });

    // Timer badge with MM:SS format should be present (minutes may exceed 2 digits in test env)
    expect(container.textContent).toMatch(/⏱\s*\d+:\d{2}/);
  });

  it("displays 'Fin de session' before the transcript card in auto-VAD mode", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-004", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-004"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
    });

    const allText = container.innerHTML;
    const finIdx = allText.indexOf("Fin de session");
    const transcriptIdx = allText.indexOf("Entretien en cours");
    expect(finIdx).toBeGreaterThan(-1);
    expect(transcriptIdx).toBeGreaterThan(-1);
    expect(finIdx).toBeLessThan(transcriptIdx);
  });

  it("mute toggle changes VAD status to Muet and back", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-005", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-005"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
    });

    // Find mute button and click it
    await act(async () => {
      const muteBtn = [...container.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("Muet"),
      );
      muteBtn?.click();
    });

    expect(container.textContent).toContain("⚫");
    expect(container.textContent).toContain("Muet");

    // Click again to unmute
    await act(async () => {
      const activateBtn = [...container.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("Activer"),
      );
      activateBtn?.click();
    });

    expect(container.textContent).toContain("🟢");
    expect(container.textContent).toContain("À l'écoute");
  });

  it("auto-starts recording when VAD detects speech above threshold", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-006", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-006"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Drive VAD loop with high level (speech) — should trigger autoStartRecording
    await act(async () => {
      // Level > VAD_THRESHOLD (0.05): fill with 200/255 ≈ 0.78 normalized, RMS ≈ 0.78 > 0.05
      await runVadFrames(3, 200);
      await new Promise((r) => setTimeout(r, 0));
    });

    // Recording state badge should be visible
    expect(container.textContent).toContain("🔴");
    expect(container.textContent).toContain("Enregistrement");
  });

  it("populates the chat transcript from session chunks on hydration", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({
          chunks: [
            {
              chunkId: "c1",
              createdAt: "2026-05-07T10:00:01.000Z",
              endedAt: "2026-05-07T10:00:01.000Z",
              errorMessage: null,
              isFinal: true,
              mimeType: "audio/wav",
              sequence: 1,
              startedAt: "2026-05-07T10:00:00.000Z",
              status: "transcribed",
              transcript: "Bonjour je me presente",
            },
          ],
          id: "session-vad-007",
          status: "ready",
        }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-007"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Bonjour je me presente");
  });

  it("does not render push-to-talk buttons in auto-VAD mode", async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        makeSessionSummary({ id: "session-vad-008", status: "ready" }),
      ok: true,
    });

    await act(async () => {
      root.render(
        <InterviewStudio
          applications={APPLICATIONS}
          preloadedSessionId="session-vad-008"
          sessionEmail="user@example.com"
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain("Demarrer l'entretien");
    expect(container.textContent).not.toContain("Arreter");
  });
});
