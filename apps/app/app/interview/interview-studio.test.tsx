// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InterviewStudio } from "./interview-studio";

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

  requestData() {
    return undefined;
  }

  stop() {
    this.state = "inactive";
    this.onstop?.(new Event("stop"));
  }
}

class FakeFileReader {
  error: Error | null = null;
  onerror: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsDataURL() {
    this.result = "data:audio/webm;base64,YXVkaW8=";
    queueMicrotask(() => {
      this.onloadend?.();
    });
  }
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
    vi.stubGlobal("FileReader", FakeFileReader);
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

  it("starts a browser recording session and posts a chunk to the Next proxy", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          session: {
            chunks: [],
            createdAt: "2026-04-24T13:00:00.000Z",
            id: "session-001",
            lastError: null,
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
          chunks: [
            {
              chunkId: "session-001-chunk-1",
              createdAt: "2026-04-24T13:00:00.500Z",
              endedAt: "2026-04-24T13:00:00.500Z",
              errorMessage: null,
              isFinal: false,
              mimeType: "audio/webm",
              sequence: 1,
              startedAt: "2026-04-24T13:00:00.000Z",
              status: "transcribed",
              transcript: "bonjour",
            },
          ],
          createdAt: "2026-04-24T13:00:00.000Z",
          id: "session-001",
          lastError: null,
          recoverable: true,
          status: "recording",
          transcript: "bonjour",
          updatedAt: "2026-04-24T13:00:00.500Z",
        }),
        ok: true,
      });

    await act(async () => {
      root.render(<InterviewStudio sessionEmail="user@example.com" />);
    });

    await act(async () => {
      container.querySelector("button")?.click();
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/interview/start",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/interview/session-001/chunk",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("bonjour");
  });

  it("rehydrates a saved session from sessionStorage", async () => {
    window.sessionStorage.setItem(
      "cvforge-interview-session:user@example.com",
      "session-002",
    );
    fetchMock.mockResolvedValue({
      json: async () => ({
        chunks: [],
        createdAt: "2026-04-24T13:00:00.000Z",
        id: "session-002",
        lastError: null,
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
});
