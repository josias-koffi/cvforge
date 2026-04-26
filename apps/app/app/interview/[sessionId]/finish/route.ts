import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../../auth-config";

type FinishRouteProps = {
  params: Promise<{ sessionId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function POST(_request: Request, { params }: FinishRouteProps) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const apiResponse = await fetch(
    `${getServerApiUrl()}/interviews/sessions/${sessionId}/finish`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      method: "POST",
    },
  );

  const payload = await apiResponse.json().catch(() => ({
    message: "Impossible de terminer la session d'interview.",
  }));

  return NextResponse.json(payload, {
    status: apiResponse.ok
      ? 200
      : apiResponse.status >= 400
        ? apiResponse.status
        : 500,
  });
}
