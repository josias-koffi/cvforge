import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../../auth-config";

type SessionRouteProps = {
  params: Promise<{ sessionId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function GET(_request: Request, { params }: SessionRouteProps) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const apiResponse = await fetch(
    `${getServerApiUrl()}/interviews/sessions/${sessionId}`,
    {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: "Session introuvable." },
      { status: apiResponse.status >= 400 ? apiResponse.status : 500 },
    );
  }

  return NextResponse.json(await apiResponse.json());
}
