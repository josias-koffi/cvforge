import { BadGatewayException, Logger } from "@nestjs/common";
import type { OpenAiRealtimeConfig } from "./openai-realtime.config";

/**
 * The one tool the recruiter has: saying the interview is over. The agenda
 * alone could not tell — it counts answers, and a recruiter that had said
 * goodbye on the clock left the call open and the report never ran.
 */
export const END_INTERVIEW_TOOL = "end_interview";

/** Anything the Realtime API sends: a `type` and whatever that type carries. */
export type RealtimeServerEvent = { type: string } & Record<string, unknown>;

/** The server's own line into a call the browser holds (the "sideband"). */
export interface RealtimeSideband {
  send(event: Record<string, unknown>): void;
  close(): void;
}

export type SidebandHandlers = {
  onOpen: () => void;
  onEvent: (event: RealtimeServerEvent) => void;
  onClose: () => void;
};

/** The slice of a WebSocket the sideband uses, so tests can hand in a fake. */
export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((message: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
  readonly readyState: number;
  send(data: string): void;
  close(): void;
}

type Hooks = {
  fetch?: typeof fetch;
  openSocket?: (url: string, headers: Record<string, string>) => SocketLike;
};

const SOCKET_OPEN = 1;

/** Opening a call is one round trip to OpenAI; past this the browser gives up. */
const CREATE_CALL_TIMEOUT_MS = 10_000;

/**
 * Node's own WebSocket (undici) accepts headers as a non-standard init field,
 * which is how the API key travels without ever reaching the browser.
 */
function openNodeSocket(
  url: string,
  headers: Record<string, string>,
): SocketLike {
  const Socket = WebSocket as unknown as new (
    url: string,
    init: { headers: Record<string, string> },
  ) => SocketLike;

  return new Socket(url, { headers });
}

/**
 * OpenAI's Realtime API, used over WebRTC (ADR-026).
 *
 * The browser's audio goes straight to OpenAI; this server never touches it.
 * What stays here is everything the browser must not hold: the API key, the
 * recruiter's brief, and a WebSocket onto the same call that follows the
 * conversation, steers the agenda and hangs up when the time is spent.
 */
export class OpenAiRealtimeService {
  private readonly logger = new Logger(OpenAiRealtimeService.name);
  private readonly fetchImpl: typeof fetch;
  private readonly openSocket: NonNullable<Hooks["openSocket"]>;

  constructor(
    private readonly config: OpenAiRealtimeConfig,
    hooks: Hooks = {},
  ) {
    this.fetchImpl = hooks.fetch ?? ((...args) => fetch(...args));
    this.openSocket = hooks.openSocket ?? openNodeSocket;
  }

  get model() {
    return this.config.model;
  }

  get transcriptionModel() {
    return this.config.transcriptionModel;
  }

  /**
   * The session a call opens with. Turn detection is semantic by default: the
   * model hears that a sentence is finished instead of waiting out a fixed
   * silence, and talking over it cancels the reply on OpenAI's side. Noise
   * reduction runs before detection, which is what keeps a noise in the room
   * from cutting the recruiter off.
   */
  buildSession(input: { instructions: string; language: string }) {
    const { config } = this;

    return {
      audio: {
        input: {
          noise_reduction:
            config.noiseReduction === "off" ? null : { type: config.noiseReduction },
          transcription: {
            language: input.language,
            model: config.transcriptionModel,
          },
          turn_detection:
            config.turnDetection === "server"
              ? {
                  create_response: true,
                  interrupt_response: true,
                  prefix_padding_ms: 300,
                  silence_duration_ms: config.vadSilenceMs,
                  threshold: config.vadThreshold,
                  type: "server_vad",
                }
              : {
                  create_response: true,
                  eagerness: config.eagerness,
                  interrupt_response: true,
                  type: "semantic_vad",
                },
        },
        output: { voice: this.config.voice },
      },
      instructions: input.instructions,
      max_output_tokens: this.config.maxOutputTokens,
      tool_choice: "auto",
      tools: [
        {
          description:
            "Ends the interview. Call it only after you have said goodbye: when the interview is over, or when the candidate asks to stop.",
          name: END_INTERVIEW_TOOL,
          parameters: { additionalProperties: false, properties: {}, type: "object" },
          type: "function",
        },
      ],
      model: this.config.model,
      type: "realtime",
    };
  }

  /**
   * Opens a call from the browser's SDP offer and returns OpenAI's answer.
   *
   * The call id comes back in the `Location` header. Reading it here, rather
   * than letting the browser post its offer itself, is what lets the server
   * join the call at all.
   */
  async createCall(input: {
    offerSdp: string;
    session: Record<string, unknown>;
    /** A stable, non-identifying id for the candidate, for OpenAI's abuse checks. */
    safetyIdentifier: string;
  }): Promise<{ answerSdp: string; callId: string }> {
    const form = new FormData();
    form.set("sdp", input.offerSdp);
    form.set("session", JSON.stringify(input.session));

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}/realtime/calls`, {
        body: form,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "OpenAI-Safety-Identifier": input.safetyIdentifier,
        },
        method: "POST",
        signal: AbortSignal.timeout(CREATE_CALL_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Realtime call not opened: ${describe(error)}`);
      throw new BadGatewayException("Le recruteur est injoignable.");
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn(
        `Realtime call refused (${response.status}): ${detail.slice(0, 300)}`,
      );
      throw new BadGatewayException("Le recruteur est injoignable.");
    }

    const callId = readCallId(response.headers.get("location"));
    if (!callId) {
      throw new BadGatewayException("Le recruteur est injoignable.");
    }

    return { answerSdp: await response.text(), callId };
  }

  /** Joins a call the browser holds, to follow and steer it from here. */
  connect(callId: string, handlers: SidebandHandlers): RealtimeSideband {
    const url = `${this.config.baseUrl.replace(/^http/, "ws")}/realtime?call_id=${encodeURIComponent(callId)}`;
    const socket = this.openSocket(url, {
      Authorization: `Bearer ${this.config.apiKey}`,
    });
    let closed = false;
    // Set once this side closes: a socket shut before it opened reports an
    // error, which is then only our own hangup.
    let closing = false;
    const closeOnce = () => {
      if (closed) return;
      closed = true;
      handlers.onClose();
    };

    socket.onopen = () => handlers.onOpen();
    socket.onmessage = (message) => {
      const event = parseEvent(message.data);
      if (event) handlers.onEvent(event);
    };
    socket.onerror = (error) => {
      if (closing) return;
      this.logger.warn(`Realtime sideband error on ${callId}: ${describe(error)}`);
    };
    socket.onclose = closeOnce;

    return {
      close: () => {
        closing = true;
        socket.close();
        closeOnce();
      },
      send: (event) => {
        if (socket.readyState === SOCKET_OPEN) socket.send(JSON.stringify(event));
      },
    };
  }

  /** Ends the call for the browser too; failing to is logged, never thrown. */
  async hangup(callId: string): Promise<void> {
    try {
      const response = await this.fetchImpl(
        `${this.config.baseUrl}/realtime/calls/${encodeURIComponent(callId)}/hangup`,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          method: "POST",
          signal: AbortSignal.timeout(CREATE_CALL_TIMEOUT_MS),
        },
      );
      if (!response.ok && response.status !== 404) {
        this.logger.warn(`Realtime hangup refused (${response.status}) on ${callId}`);
      }
    } catch (error) {
      this.logger.warn(`Realtime hangup failed on ${callId}: ${describe(error)}`);
    }
  }
}

/** `/v1/realtime/calls/rtc_…` or a bare id, whichever the header carries. */
export function readCallId(location: string | null): string | null {
  const id = location?.trim().split("/").filter(Boolean).pop();

  return id ? id : null;
}

function parseEvent(data: unknown): RealtimeServerEvent | null {
  const text =
    typeof data === "string"
      ? data
      : data instanceof ArrayBuffer
        ? new TextDecoder().decode(data)
        : null;
  if (text === null) return null;

  try {
    const event = JSON.parse(text) as unknown;
    return event &&
      typeof event === "object" &&
      typeof (event as { type?: unknown }).type === "string"
      ? (event as RealtimeServerEvent)
      : null;
  } catch {
    return null;
  }
}

/** A socket's `ErrorEvent` is no `Error`, and prints as "[object ErrorEvent]". */
function describe(error: unknown) {
  if (error instanceof Error) return error.message;
  const detail = error as { message?: unknown; error?: unknown } | null;
  if (detail?.error instanceof Error) return detail.error.message;
  if (typeof detail?.message === "string" && detail.message) return detail.message;

  return String(error);
}
