import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LetterDocumentContent, LetterGenerationRequest } from "@cvforge/types";
import { getServerApiUrl } from "../../../auth-config";

type RegenerateBody = LetterGenerationRequest & { applicationId?: string };

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  let body: Partial<RegenerateBody>;

  try {
    body = (await request.json()) as Partial<RegenerateBody>;
  } catch {
    return NextResponse.json(
      { message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const { applicationId } = await params;

  const refinement =
    typeof body.refinement === "string" && body.refinement.trim()
      ? body.refinement.trim()
      : undefined;

  const apiPayload: LetterGenerationRequest = {
    localFields: body.localFields ?? { email: "", lastName: "", phone: "" },
    promptProfile: body.promptProfile ?? {
      headline: "",
      identity: { candidateToken: "[CANDIDATE]", city: "", firstName: "" },
      profileSections: {
        certifications: [],
        education: [],
        experiences: [],
        interests: "",
        personalProjects: [],
        softSkills: [],
        summary: "",
        technicalSkills: [],
      },
    },
    ...(refinement ? { refinement } : {}),
  };

  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const apiResponse = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/generate-letter`,
    {
      body: JSON.stringify(apiPayload),
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      method: "POST",
    },
  );

  if (!apiResponse.ok) {
    let message = "La régénération de la LM a échoué.";

    try {
      const data = (await apiResponse.json()) as { message?: string };
      if (typeof data.message === "string") message = data.message;
    } catch {
      // ignore
    }

    const statusCode =
      apiResponse.status >= 400 && apiResponse.status < 600
        ? apiResponse.status
        : 500;
    return NextResponse.json({ message }, { status: statusCode });
  }

  const payload = (await apiResponse.json()) as {
    letterContent: LetterDocumentContent;
  };
  return NextResponse.json({ letterContent: payload.letterContent });
}
