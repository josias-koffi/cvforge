import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function GET() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/notifications/summary`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const payload = await response.json();

  return NextResponse.json(payload, {
    status: response.status,
  });
}
