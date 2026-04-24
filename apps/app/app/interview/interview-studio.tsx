"use client";

import React, { startTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@cvforge/ui";
import type { InterviewSessionSummary, InterviewTranscriptionChunkRequest } from "@cvforge/types";

const STORAGE_KEY_PREFIX = "cvforge-interview-session";

type StudioState =
  | "idle"
  | "booting"
  | "recording"
  | "syncing"
  | "ready"
  | "error"
  | "unsupported";

type MediaRecorderConstructor = typeof MediaRecorder;

function getStorageKey(sessionEmail: string) {
  return `${STORAGE_KEY_PREFIX}:${sessionEmail}`;
}

function getMediaRecorderCtor(): MediaRecorderConstructor | null {
  return typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    typeof window.MediaRecorder === "function"
    ? window.MediaRecorder
    : null;
}

function browserAudioSupported() {
  return Boolean(
    getMediaRecorderCtor() &&
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia,
  );
}

function getPreferredMimeType() {
  const Recorder = getMediaRecorderCtor();

  if (!Recorder || typeof Recorder.isTypeSupported !== "function") {
    return "";
  }

  return (
    [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ].find((candidate) => Recorder.isTypeSupported(candidate)) ?? ""
  );
}

function inferAudioFormat(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Audio encoding failed."));
        return;
      }

      const [, payload = ""] = reader.result.split(",", 2);
      resolve(payload);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Audio encoding failed."));
    reader.readAsDataURL(blob);
  });
}

function summarizeChunkCount(session: InterviewSessionSummary | null) {
  return session?.chunks.length ?? 0;
}

function resolveStateFromSession(session: InterviewSessionSummary): StudioState {
  if (session.status === "error") return "error";
  if (session.status === "recording") return "ready";
  if (session.status === "ready") return "ready";
  return "idle";
}

export function InterviewStudio({ sessionEmail }: { sessionEmail: string }) {
  const [session, setSession] = React.useState<InterviewSessionSummary | null>(null);
  const [state, setState] = React.useState<StudioState>(
    browserAudioSupported() ? "idle" : "unsupported",
  );
  const [message, setMessage] = React.useState(
    "Autorisez le microphone puis lancez un enregistrement par chunks de 500 ms.",
  );
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const sequenceRef = React.useRef(1);
  const chunkStartedAtRef = React.useRef<number | null>(null);
  const pendingStopRef = React.useRef(false);
  const uploadQueueRef = React.useRef(Promise.resolve());

  const updateSession = React.useCallback((nextSession: InterviewSessionSummary) => {
    startTransition(() => {
      setSession(nextSession);
      setState(resolveStateFromSession(nextSession));
      if (nextSession.lastError) {
        setMessage(nextSession.lastError);
      } else if (nextSession.status === "ready") {
        setMessage("Transcription complete. Vous pouvez reprendre ou repartir d'une nouvelle session.");
      } else {
        setMessage(
          "Chunks recus par le backend. La transcription partielle reste disponible en cas de reprise.",
        );
      }
    });
  }, []);

  const persistSessionId = React.useCallback(
    (sessionId: string | null) => {
      if (typeof window === "undefined") {
        return;
      }

      const storageKey = getStorageKey(sessionEmail);
      if (!sessionId) {
        window.sessionStorage.removeItem(storageKey);
        return;
      }

      window.sessionStorage.setItem(storageKey, sessionId);
    },
    [sessionEmail],
  );

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const hydrateSession = React.useCallback(
    async (sessionId: string) => {
      const response = await fetch(`/interview/${sessionId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        persistSessionId(null);
        return null;
      }

      const payload = (await response.json()) as InterviewSessionSummary;
      sequenceRef.current = summarizeChunkCount(payload) + 1;
      updateSession(payload);
      return payload;
    },
    [persistSessionId, updateSession],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedSessionId = window.sessionStorage.getItem(
      getStorageKey(sessionEmail),
    );

    if (!storedSessionId) {
      return;
    }

    void hydrateSession(storedSessionId);

    return () => {
      recorderRef.current?.stop?.();
      stopStream();
    };
  }, [hydrateSession, sessionEmail, stopStream]);

  async function ensureSessionId() {
    if (session?.id) {
      sequenceRef.current = summarizeChunkCount(session) + 1;
      return session.id;
    }

    const response = await fetch("/interview/start", { method: "POST" });
    if (!response.ok) {
      throw new Error("Impossible de creer une session d'interview.");
    }

    const payload = (await response.json()) as {
      session: InterviewSessionSummary;
      sessionId: string;
    };
    sequenceRef.current = 1;
    persistSessionId(payload.sessionId);
    updateSession(payload.session);
    return payload.sessionId;
  }

  function enqueueUpload(task: () => Promise<void>) {
    uploadQueueRef.current = uploadQueueRef.current.then(task, task);
    return uploadQueueRef.current;
  }

  async function uploadChunk(
    sessionId: string,
    blob: Blob,
    isFinal: boolean,
    sequence: number,
    startedAtIso: string,
    endedAtIso: string,
  ) {
    const payload: InterviewTranscriptionChunkRequest = {
      chunkBase64: await blobToBase64(blob),
      chunkId: `${sessionId}-chunk-${sequence}`,
      endedAt: endedAtIso,
      format: inferAudioFormat(blob.type),
      isFinal,
      mimeType: blob.type || "audio/webm",
      sequence,
      startedAt: startedAtIso,
    };

    const response = await fetch(`/interview/${sessionId}/chunk`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const nextSession = (await response.json().catch(() => null)) as
      | InterviewSessionSummary
      | null;

    if (!response.ok || !nextSession) {
      setState("error");
      setMessage("Le backend n'a pas confirme la transcription du chunk.");
      return;
    }

    updateSession(nextSession);
  }

  async function startCapture() {
    if (!browserAudioSupported()) {
      setState("unsupported");
      setMessage("MediaRecorder n'est pas disponible dans ce navigateur.");
      return;
    }

    setState("booting");
    setMessage("Demande d'autorisation micro en cours...");

    try {
      const sessionId = await ensureSessionId();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mimeType = getPreferredMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunkStartedAtRef.current = Date.now();
      pendingStopRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size <= 0) {
          return;
        }

        const startedAt = new Date(
          chunkStartedAtRef.current ?? Date.now(),
        ).toISOString();
        const endedAt = new Date().toISOString();
        const sequence = sequenceRef.current;
        const isFinal = pendingStopRef.current;

        sequenceRef.current += 1;
        chunkStartedAtRef.current = Date.now();

        void enqueueUpload(async () => {
          setState("syncing");
          setMessage(`Chunk ${sequence} envoye vers Voxtral Small.`);
          await uploadChunk(
            sessionId,
            event.data,
            isFinal,
            sequence,
            startedAt,
            endedAt,
          );
          if (recorderRef.current?.state === "recording") {
            setState("recording");
          }
        });
      };

      recorder.onerror = () => {
        setState("error");
        setMessage("Le navigateur a interrompu la capture audio. Reprenez la session.");
        stopStream();
      };

      recorder.onstart = () => {
        setState("recording");
        setMessage("Capture active. Les chunks de 500 ms partent vers le backend au fil de la parole.");
      };

      recorder.onstop = () => {
        if (state !== "error") {
          setState("ready");
        }
        pendingStopRef.current = false;
        stopStream();
      };

      recorder.start(500);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Le microphone n'a pas pu etre initialise.",
      );
      stopStream();
    }
  }

  function stopCapture() {
    if (!recorderRef.current || recorderRef.current.state !== "recording") {
      return;
    }

    pendingStopRef.current = true;
    recorderRef.current.requestData();
    recorderRef.current.stop();
  }

  function resetSession() {
    recorderRef.current?.stop?.();
    stopStream();
    recorderRef.current = null;
    sequenceRef.current = 1;
    persistSessionId(null);
    setSession(null);
    setState(browserAudioSupported() ? "idle" : "unsupported");
    setMessage("Nouvelle session prete. Lancez un nouvel enregistrement.");
  }

  const isRecording = recorderRef.current?.state === "recording";

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <CardHeader>
          <CardTitle>Streaming STT progressif</CardTitle>
          <CardDescription>
            Le navigateur decoupe la parole en chunks de 500 ms et le backend
            envoie chaque segment a Voxtral Small via OpenRouter.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Badge
                style={state === "error" ? { borderColor: "#E5B8AF", color: "#8A2C20" } : undefined}
                variant="outline"
              >
                Etat: {state}
              </Badge>
              <Badge variant="outline">
                Session: {session?.id ?? "pas encore creee"}
              </Badge>
              <Badge variant="outline">
                Chunks: {summarizeChunkCount(session)}
              </Badge>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button
                disabled={state === "booting" || state === "syncing" || isRecording}
                onClick={() => void startCapture()}
                type="button"
              >
                {session ? "Reprendre la capture" : "Demarrer l'entretien"}
              </Button>
              <Button
                disabled={!isRecording}
                onClick={stopCapture}
                type="button"
                variant="secondary"
              >
                Arreter
              </Button>
              <Button onClick={resetSession} type="button" variant="ghost">
                Nouvelle session
              </Button>
            </div>
          </div>

          <p
            role={state === "error" ? "alert" : "status"}
            style={{
              backgroundColor: state === "error" ? "#FBEAE7" : "#FAFAF7",
              border: "1px solid #D9D4CA",
              borderRadius: "0.75rem",
              color: state === "error" ? "#8A2C20" : "#4E4A43",
              lineHeight: 1.6,
              margin: 0,
              padding: "0.875rem 1rem",
            }}
          >
            {message}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcription partielle</CardTitle>
          <CardDescription>
            Reprise resiliente: la session courante est conservee dans le navigateur
            et rehydratee si vous revenez sur la page.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <Textarea
            aria-label="Transcription de l'entretien"
            readOnly
            rows={10}
            value={session?.transcript ?? ""}
          />
          <div
            style={{
              color: "#6B6860",
              display: "grid",
              fontSize: "0.95rem",
              gap: "0.4rem",
            }}
          >
            {session?.chunks.map((chunk) => (
              <span key={chunk.chunkId}>
                Chunk {chunk.sequence}: {chunk.status}
                {chunk.errorMessage ? ` — ${chunk.errorMessage}` : ""}
              </span>
            )) ?? <span>Aucun chunk traite pour le moment.</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
