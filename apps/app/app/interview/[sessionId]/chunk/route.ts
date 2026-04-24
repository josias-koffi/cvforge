import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { InterviewTranscriptionChunkRequest } from "@cvforge/types";
import { getServerApiUrl } from "../../../auth-config";

type ChunkRouteProps = {
  params: Promise<{ sessionId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

function isChunkRequest(
  value: Partial<InterviewTranscriptionChunkRequest>,
): value is InterviewTranscriptionChunkRequest {
  return (
    typeof value.chunkBase64 === "string" &&
    typeof value.chunkId === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.format === "string" &&
    typeof value.isFinal === "boolean" &&
    typeof value.mimeType === "string" &&
    typeof value.sequence === "number" &&
    typeof value.startedAt === "string"
  );
}

export async function POST(request: Request, { params }: ChunkRouteProps) {
  let body: Partial<InterviewTranscriptionChunkRequest>;

  try {
    body = (await request.json()) as Partial<InterviewTranscriptionChunkRequest>;
  } catch {
    return NextResponse.json(
      { message: "Corps de chunk invalide." },
      { status: 400 },
    );
  }

  if (!isChunkRequest(body)) {
    return NextResponse.json(
      { message: "Chunk incomplet." },
      { status: 400 },
    );
  }

  const { sessionId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const apiResponse = await fetch(
    `${getServerApiUrl()}/interviews/sessions/${sessionId}/chunks`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      method: "POST",
    },
  );

  const payload = await apiResponse.json().catch(() => ({
    message: "La transcription du chunk a echoue.",
  }));

  return NextResponse.json(payload, {
    status: apiResponse.ok
      ? 200
      : apiResponse.status >= 400
        ? apiResponse.status
        : 500,
  });
}
