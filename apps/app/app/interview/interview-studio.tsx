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
import type {
  InterviewAIResponseEvent,
  InterviewRecruiterProfile,
  InterviewSessionStartRequest,
  InterviewSessionSummary,
  InterviewTranscriptionChunkRequest,
  Locale,
} from "@cvforge/types";

const STORAGE_KEY_PREFIX = "cvforge-interview-session";
const TARGET_WAV_SAMPLE_RATE = 16000;
const VAD_THRESHOLD = 0.05;
const VAD_FFT_SIZE = 256;

type StudioState =
  | "idle"
  | "booting"
  | "recording"
  | "syncing"
  | "ready"
  | "completed"
  | "error"
  | "unsupported";

type AIState = "idle" | "generating" | "speaking" | "done" | "error";

type PipelineEvent = {
  label: string;
  timestamp: string;
};

type LatencyMeasure = {
  label: string;
  durationMs: number;
};

const INTERVIEW_PROFILE_LABELS: Record<InterviewRecruiterProfile, string> = {
  aggressive: "Agressif",
  behavioral: "Comportemental",
  passive: "Passif",
  standard: "Standard",
  technical: "Technique",
};

const INTERVIEW_PROFILE_HINTS: Record<InterviewRecruiterProfile, string> = {
  aggressive: "Questions pieges, pression et relances plus incisives.",
  behavioral: "Questions STAR sur les situations vecues et les resultats.",
  passive: "Tonalite sobre, silences implicites et relances plus vagues.",
  standard: "Entretien RH classique, neutre et professionnel.",
  technical: "Focus hard skills, architecture et mises en situation.",
};

function markLatency(name: string) {
  if (typeof performance !== "undefined") {
    performance.mark(name);
  }
}

function measureLatency(label: string, start: string, end: string): LatencyMeasure | null {
  if (typeof performance === "undefined") return null;
  try {
    const entry = performance.measure(label, start, end);
    return { label, durationMs: Math.round(entry.duration) };
  } catch {
    return null;
  }
}

type MediaRecorderConstructor = typeof MediaRecorder;
type BrowserWindowWithAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type AudioContextWithAnalyser = AudioContext & {
  createMediaStreamSource: (stream: MediaStream) => MediaStreamAudioSourceNode;
  createAnalyser: () => AnalyserNode;
};

type SpeechVoice = SpeechSynthesisVoice;

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

// Voxtral only accepts complete MP3 or WAV files — not WebM/Opus stream fragments.
// We accumulate all MediaRecorder blobs, then decode and re-encode as WAV on stop.
function writeWavHeader(view: DataView, numSamples: number, sampleRate: number) {
  const dataSize = numSamples * 2; // 16-bit mono
  const setStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  setStr(0, "RIFF"); view.setUint32(4, 36 + dataSize, true);
  setStr(8, "WAVE"); setStr(12, "fmt ");
  view.setUint32(16, 16, true);   // chunk size
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);    // block align
  view.setUint16(34, 16, true);   // bits per sample
  setStr(36, "data"); view.setUint32(40, dataSize, true);
}

function resampleMonoPcm(input: Float32Array, inputSampleRate: number) {
  if (inputSampleRate <= TARGET_WAV_SAMPLE_RATE) {
    return { pcm: input, sampleRate: inputSampleRate };
  }

  const ratio = inputSampleRate / TARGET_WAV_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex++) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio));
    let sum = 0;
    let count = 0;

    for (let inputIndex = start; inputIndex < end; inputIndex++) {
      sum += input[inputIndex] ?? 0;
      count += 1;
    }

    output[outputIndex] = count > 0 ? sum / count : 0;
  }

  return { pcm: output, sampleRate: TARGET_WAV_SAMPLE_RATE };
}

async function blobsToWavBase64(blobs: Blob[]): Promise<string> {
  const combined = new Blob(blobs, { type: blobs[0]?.type ?? "audio/webm" });
  const arrayBuffer = await combined.arrayBuffer();
  const AudioContextCtor =
    typeof window !== "undefined"
      ? window.AudioContext ?? (window as BrowserWindowWithAudioContext).webkitAudioContext
      : undefined;

  if (!AudioContextCtor) {
    throw new Error("La conversion audio WAV n'est pas disponible dans ce navigateur.");
  }

  const ctx = new AudioContextCtor();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }
  const { pcm, sampleRate } = resampleMonoPcm(
    audioBuffer.getChannelData(0),
    audioBuffer.sampleRate,
  );
  const wav = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wav);
  writeWavHeader(view, pcm.length, sampleRate);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(wav);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function summarizeChunkCount(session: InterviewSessionSummary | null) {
  return session?.chunks.length ?? 0;
}

function resolveStateFromSession(session: InterviewSessionSummary): StudioState {
  if (session.status === "error") return "error";
  if (session.status === "completed") return "completed";
  if (session.status === "recording") return "ready";
  if (session.status === "ready") return "ready";
  return "idle";
}

function stopRecorderIfRecording(recorder: MediaRecorder | null) {
  if (!recorder || recorder.state !== "recording") {
    return false;
  }

  recorder.stop();
  return true;
}

export function InterviewStudio({ sessionEmail }: { sessionEmail: string }) {
  const [session, setSession] = React.useState<InterviewSessionSummary | null>(null);
  const [language, setLanguage] = React.useState<Locale>("fr");
  const [profile, setProfile] =
    React.useState<InterviewRecruiterProfile>("standard");
  const [state, setState] = React.useState<StudioState>(
    browserAudioSupported() ? "idle" : "unsupported",
  );
  const [message, setMessage] = React.useState(
    "Autorisez le microphone puis lancez un enregistrement par chunks de 500 ms.",
  );
  const [aiState, setAIState] = React.useState<AIState>("idle");
  const [aiText, setAIText] = React.useState("");
  const [pipelineEvents, setPipelineEvents] = React.useState<PipelineEvent[]>([]);
  const [latencyMeasures, setLatencyMeasures] = React.useState<LatencyMeasure[]>([]);
  const [vadLevel, setVadLevel] = React.useState(0);
  const autoAISessionIdRef = React.useRef<string | null>(null);
  const utteranceQueueRef = React.useRef<string[]>([]);
  const speakingRef = React.useRef(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const sequenceRef = React.useRef(1);
  const recordingStartRef = React.useRef<number | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const vadCtxRef = React.useRef<AudioContext | null>(null);
  const vadRafRef = React.useRef<number | null>(null);

  const updateSession = React.useCallback((nextSession: InterviewSessionSummary) => {
    startTransition(() => {
      setSession(nextSession);
      setLanguage(nextSession.language);
      setProfile(nextSession.profile);
      setState(resolveStateFromSession(nextSession));
      if (nextSession.status === "completed") {
        setMessage(
          "Session terminee proprement. Vous pouvez relire la transcription ou lancer une nouvelle session.",
        );
      } else if (nextSession.lastError) {
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

  const stopVad = React.useCallback(() => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    void vadCtxRef.current?.close();
    vadCtxRef.current = null;
    setVadLevel(0);
  }, []);

  const stopStream = React.useCallback(() => {
    stopVad();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [stopVad]);

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
      stopRecorderIfRecording(recorderRef.current);
      stopStream();
    };
  }, [hydrateSession, sessionEmail, stopStream]);

  async function ensureSessionId() {
    if (session?.id) {
      sequenceRef.current = summarizeChunkCount(session) + 1;
      return session.id;
    }

    const startPayload: InterviewSessionStartRequest = { language, profile };
    const response = await fetch("/interview/start", {
      body: JSON.stringify(startPayload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
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

  async function finishSession() {
    const sessionId = session?.id;
    if (!sessionId) {
      return;
    }

    stopRecorderIfRecording(recorderRef.current);
    stopStream();

    const response = await fetch(`/interview/${sessionId}/finish`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as
      | InterviewSessionSummary
      | null;

    if (!response.ok || !payload) {
      setState("error");
      setMessage("Impossible de terminer la session proprement.");
      return;
    }

    persistSessionId(null);
    updateSession(payload);
  }

  async function uploadWav(
    sessionId: string,
    wavBase64: string,
    sequence: number,
    startedAtIso: string,
    endedAtIso: string,
  ) {
    const payload: InterviewTranscriptionChunkRequest = {
      chunkBase64: wavBase64,
      chunkId: `${sessionId}-chunk-${sequence}`,
      endedAt: endedAtIso,
      format: "wav",
      isFinal: true,
      mimeType: "audio/wav",
      sequence,
      startedAt: startedAtIso,
    };

    const response = await fetch(`/interview/${sessionId}/chunk`, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const nextSession = (await response.json().catch(() => null)) as
      | InterviewSessionSummary
      | null;

    if (!response.ok || !nextSession) {
      setState("error");
      setMessage("La transcription Voxtral a echoue.");
      return;
    }

    updateSession(nextSession);
  }

  function addPipelineEvent(label: string) {
    setPipelineEvents((prev) => [
      ...prev,
      { label, timestamp: new Date().toISOString() },
    ]);
  }

  function speakNext() {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      speakingRef.current ||
      utteranceQueueRef.current.length === 0
    ) {
      return;
    }

    const text = utteranceQueueRef.current.shift();
    if (!text) return;

    speakingRef.current = true;
    setAIState("speaking");
    markLatency("tts_start");
    const perceivedLatency = measureLatency("Latence percue (T0→TTS)", "recording_stop", "tts_start");
    if (perceivedLatency) setLatencyMeasures((prev) => (prev.some((m) => m.label === perceivedLatency.label) ? prev : [...prev, perceivedLatency]));
    const sttToTts = measureLatency("STT→TTS total", "recording_stop", "tts_start");
    if (sttToTts) setLatencyMeasures((prev) => prev);
    addPipelineEvent(`Audio utterance started: "${text.slice(0, 40)}..."`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "fr" ? "fr-FR" : "en-US";
    const voices = window.speechSynthesis.getVoices() as SpeechVoice[];
    const preferredVoice = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(language === "fr" ? "fr" : "en"),
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.onend = () => {
      addPipelineEvent("Audio utterance ended");
      speakingRef.current = false;
      if (utteranceQueueRef.current.length > 0) {
        speakNext();
      } else if (aiState !== "generating") {
        setAIState("done");
      }
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      addPipelineEvent("Audio utterance error");
    };

    window.speechSynthesis.speak(utterance);
  }

  async function streamAIResponse(overrideSessionId?: string) {
    const sid = overrideSessionId ?? session?.id;
    if (!sid) return;

    setAIState("generating");
    setAIText("");
    setPipelineEvents([]);
    setLatencyMeasures([]);
    utteranceQueueRef.current = [];
    speakingRef.current = false;
    markLatency("llm_start");
    addPipelineEvent("LLM stream started");

    const response = await fetch(`/interview/${sid}/respond`, {
      cache: "no-store",
      headers: { Accept: "text/event-stream" },
    });

    if (!response.ok || !response.body) {
      setAIState("error");
      addPipelineEvent("Stream connection failed");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentenceBuffer = "";

    addPipelineEvent("SSE connection established");

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();

          let event: InterviewAIResponseEvent;
          try {
            event = JSON.parse(raw) as InterviewAIResponseEvent;
          } catch {
            continue;
          }

          if (event.type === "chunk" && event.text) {
            setAIText((prev) => prev + event.text);
            sentenceBuffer += event.text;
            markLatency("llm_first_token");
            const ttft = measureLatency("TTFT (LLM)", "llm_start", "llm_first_token");
            if (ttft) setLatencyMeasures((prev) => (prev.some((m) => m.label === ttft.label) ? prev : [...prev, ttft]));
            addPipelineEvent(`LLM chunk received (${event.text.length} chars)`);

            const sentenceEnd = sentenceBuffer.search(/[.!?]\s/u);
            if (sentenceEnd !== -1) {
              const sentence = sentenceBuffer.slice(0, sentenceEnd + 1).trim();
              sentenceBuffer = sentenceBuffer.slice(sentenceEnd + 2);
              if (sentence) {
                utteranceQueueRef.current.push(sentence);
                speakNext();
              }
            }
          } else if (event.type === "done") {
            addPipelineEvent("LLM generation complete");
            if (sentenceBuffer.trim()) {
              utteranceQueueRef.current.push(sentenceBuffer.trim());
              sentenceBuffer = "";
              speakNext();
            }
            if (!speakingRef.current && utteranceQueueRef.current.length === 0) {
              setAIState("done");
            }
          } else if (event.type === "error") {
            setAIState("error");
            addPipelineEvent(`Error: ${event.message ?? "unknown"}`);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
      audioChunksRef.current = [];
      recordingStartRef.current = Date.now();

      // VAD: analyse the live stream for voice activity
      try {
        const AudioContextCtor =
          typeof window !== "undefined"
            ? window.AudioContext ?? (window as BrowserWindowWithAudioContext).webkitAudioContext
            : undefined;
        if (AudioContextCtor) {
          const ctx = new AudioContextCtor() as AudioContextWithAnalyser;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = VAD_FFT_SIZE;
          source.connect(analyser);
          analyserRef.current = analyser;
          vadCtxRef.current = ctx;

          const freqData = new Uint8Array(analyser.frequencyBinCount);
          function vadLoop() {
            analyser.getByteFrequencyData(freqData);
            let sumSq = 0;
            for (let i = 0; i < freqData.length; i++) {
              const norm = (freqData[i] ?? 0) / 255;
              sumSq += norm * norm;
            }
            const rms = Math.sqrt(sumSq / freqData.length);
            setVadLevel(rms);
            vadRafRef.current = requestAnimationFrame(vadLoop);
          }
          vadRafRef.current = requestAnimationFrame(vadLoop);
        }
      } catch {
        // VAD is non-critical; degrade gracefully if AudioContext is unavailable
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setState("error");
        setMessage("Le navigateur a interrompu la capture audio. Reprenez la session.");
        audioChunksRef.current = [];
        stopStream();
      };

      recorder.onstart = () => {
        setState("recording");
        setMessage("Capture active. Parlez maintenant — la transcription démarrera à l'arrêt.");
      };

      recorder.onstop = () => {
        markLatency("recording_stop");
        recorderRef.current = null;
        stopStream();
        const blobs = audioChunksRef.current;
        audioChunksRef.current = [];

        if (blobs.length === 0) {
          setState("ready");
          return;
        }

        const startedAt = new Date(recordingStartRef.current ?? Date.now()).toISOString();
        const endedAt = new Date().toISOString();
        const sequence = sequenceRef.current;
        sequenceRef.current += 1;

        setState("syncing");
        setMessage("Conversion WAV et transcription Voxtral en cours...");
        autoAISessionIdRef.current = sessionId;

        void blobsToWavBase64(blobs)
          .then(async (wavBase64) => {
            await uploadWav(sessionId, wavBase64, sequence, startedAt, endedAt);
            markLatency("stt_done");
            const sttLatency = measureLatency("STT (Voxtral)", "recording_stop", "stt_done");
            if (sttLatency) setLatencyMeasures((prev) => [...prev, sttLatency]);
            await streamAIResponse(sessionId);
          })
          .catch((error) => {
            setState("error");
            setMessage(error instanceof Error ? error.message : "Conversion audio échouée.");
          });
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
    try {
      stopRecorderIfRecording(recorderRef.current);
    } catch {
      recorderRef.current = null;
      stopStream();
      setState("error");
      setMessage("La capture audio a deja ete arretee. Reprenez une nouvelle capture.");
    }
  }

  function resetSession() {
    stopRecorderIfRecording(recorderRef.current);
    stopStream();
    recorderRef.current = null;
    audioChunksRef.current = [];
    sequenceRef.current = 1;
    persistSessionId(null);
    setSession(null);
    setProfile("standard");
    setState(browserAudioSupported() ? "idle" : "unsupported");
    setMessage("Nouvelle session prete. Lancez un nouvel enregistrement.");
  }

  const isRecording = recorderRef.current?.state === "recording";
  const isSpeaking = isRecording && vadLevel > VAD_THRESHOLD;
  const languageLocked = Boolean(session?.id);
  const sessionCompleted = session?.status === "completed";
  const canFinishSession =
    Boolean(session?.id) &&
    !sessionCompleted &&
    state !== "booting" &&
    state !== "syncing" &&
    !isRecording;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,124,89,0.4); }
          50% { opacity: 0.85; box-shadow: 0 0 0 6px rgba(74,124,89,0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
            <div
              aria-live="polite"
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
            >
              {isRecording ? (
                <Badge
                  aria-label={isSpeaking ? "Micro actif – parole détectée" : "Micro actif – silence"}
                  style={{
                    alignItems: "center",
                    animation: "mic-pulse 1.2s ease-in-out infinite",
                    borderColor: "#4A7C59",
                    color: "#2D5A3D",
                    display: "inline-flex",
                    gap: "0.4rem",
                  }}
                  variant="outline"
                >
                  <span
                    style={{
                      background: "#4A7C59",
                      borderRadius: "50%",
                      display: "inline-block",
                      height: isSpeaking ? "10px" : "8px",
                      transition: "height 0.1s, width 0.1s",
                      width: isSpeaking ? "10px" : "8px",
                    }}
                  />
                  {isSpeaking ? "Parole détectée" : "Micro actif"}
                </Badge>
              ) : (
                <Badge
                  style={state === "error" ? { borderColor: "#E5B8AF", color: "#8A2C20" } : undefined}
                  variant="outline"
                >
                  Etat: {state}
                </Badge>
              )}
              <Badge variant="outline">
                Langue: {language === "fr" ? "FR" : "EN"}
              </Badge>
              <Badge variant="outline">
                Profil: {INTERVIEW_PROFILE_LABELS[profile]}
              </Badge>
              <Badge variant="outline">
                Session: {session?.id ?? "pas encore creee"}
              </Badge>
              <Badge variant="outline">
                Chunks: {summarizeChunkCount(session)}
              </Badge>
            </div>
            {isRecording && (
              <div
                aria-hidden="true"
                style={{
                  background: "#F0EDE8",
                  borderRadius: "2px",
                  height: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: isSpeaking ? "#4A7C59" : "#D9D4CA",
                    borderRadius: "2px",
                    height: "100%",
                    transition: "width 0.05s linear, background 0.1s",
                    width: `${Math.min(100, vadLevel * 100 * 4)}%`,
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <label
                style={{
                  alignItems: "center",
                  color: "#4E4A43",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <span>Langue</span>
                <select
                  aria-label="Langue de l'entretien"
                  disabled={languageLocked || isRecording || state === "syncing"}
                  onChange={(event) =>
                    setLanguage(event.target.value === "en" ? "en" : "fr")
                  }
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #D9D4CA",
                    borderRadius: "0.65rem",
                    padding: "0.45rem 0.75rem",
                  }}
                  value={language}
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label
                style={{
                  alignItems: "center",
                  color: "#4E4A43",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <span>Profil</span>
                <select
                  aria-label="Profil du recruteur"
                  disabled={languageLocked || isRecording || state === "syncing"}
                  onChange={(event) =>
                    setProfile(event.target.value as InterviewRecruiterProfile)
                  }
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #D9D4CA",
                    borderRadius: "0.65rem",
                    padding: "0.45rem 0.75rem",
                  }}
                  value={profile}
                >
                  <option value="standard">Standard</option>
                  <option value="aggressive">Agressif</option>
                  <option value="passive">Passif</option>
                  <option value="technical">Technique</option>
                  <option value="behavioral">Comportemental</option>
                </select>
              </label>
              <Button
                disabled={
                  state === "booting" ||
                  state === "syncing" ||
                  isRecording ||
                  sessionCompleted
                }
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
              <Button
                disabled={!canFinishSession}
                onClick={() => void finishSession()}
                type="button"
                variant="secondary"
              >
                Terminer la session
              </Button>
              <Button onClick={resetSession} type="button" variant="ghost">
                Nouvelle session
              </Button>
            </div>
          </div>

          <p
            style={{
              color: "#6B6860",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {INTERVIEW_PROFILE_HINTS[profile]}
          </p>

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

      <Card>
        <CardHeader>
          <CardTitle>Reponse IA (LLM → TTS)</CardTitle>
          <CardDescription>
            Le pipeline: transcript → LLM streaming → synthese vocale phrase par phrase avant la fin de generation.
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
            <div
              aria-live="assertive"
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
            >
              {aiState === "generating" ? (
                <Badge
                  aria-label="IA : génération en cours"
                  style={{
                    alignItems: "center",
                    background: "#F5EFE6",
                    borderColor: "#C8A96E",
                    color: "#6B4C1E",
                    display: "inline-flex",
                    gap: "0.4rem",
                  }}
                  variant="outline"
                >
                  <span
                    aria-hidden="true"
                    style={{ animation: "spin 1s linear infinite", display: "inline-block" }}
                  >
                    ⟳
                  </span>
                  Thinking…
                </Badge>
              ) : (
                <Badge
                  style={aiState === "error" ? { borderColor: "#E5B8AF", color: "#8A2C20" } : undefined}
                  variant="outline"
                >
                  IA: {aiState}
                </Badge>
              )}
            </div>
            <Button
              disabled={
                session?.status !== "ready" ||
                sessionCompleted ||
                aiState === "generating" ||
                aiState === "speaking"
              }
              onClick={() => void streamAIResponse()}
              title="Déclenche manuellement si la génération automatique a échoué"
              type="button"
            >
              Relancer la réponse IA
            </Button>
          </div>

          <Textarea
            aria-label="Reponse generee par le LLM"
            readOnly
            rows={6}
            value={aiText}
          />

          {latencyMeasures.length > 0 && (
            <div
              aria-label="Mesures de latence"
              style={{
                background: "#F0EDE8",
                border: "1px solid #D9D4CA",
                borderRadius: "0.75rem",
                display: "grid",
                fontSize: "0.85rem",
                gap: "0.25rem",
                padding: "0.75rem 1rem",
              }}
            >
              <strong style={{ color: "#4E4A43", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latence perçue</strong>
              {latencyMeasures.map((m) => (
                <span key={m.label} style={{ color: m.label.startsWith("Latence") && m.durationMs > 1200 ? "#8A2C20" : "#4E4A43" }}>
                  {m.label}: <strong>{m.durationMs} ms</strong>
                  {m.label.startsWith("Latence") && (m.durationMs <= 1200 ? " ✓ cible atteinte" : " ✗ cible manquée (> 1200 ms)")}
                </span>
              ))}
            </div>
          )}

          {pipelineEvents.length > 0 && (
            <div
              role="log"
              aria-label="Pipeline observable"
              style={{
                background: "#FAFAF7",
                border: "1px solid #D9D4CA",
                borderRadius: "0.75rem",
                color: "#6B6860",
                display: "grid",
                fontSize: "0.85rem",
                gap: "0.25rem",
                maxHeight: "10rem",
                overflowY: "auto",
                padding: "0.75rem 1rem",
              }}
            >
              {pipelineEvents.map((ev, i) => (
                <span key={i}>
                  <span style={{ color: "#9B978E" }}>{ev.timestamp.slice(11, 23)}</span>{" "}
                  {ev.label}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
