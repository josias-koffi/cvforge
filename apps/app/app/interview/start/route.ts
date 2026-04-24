import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function POST() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const apiResponse = await fetch(`${getServerApiUrl()}/interviews/sessions`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    method: "POST",
  });

  if (!apiResponse.ok) {
    return NextResponse.json(
      { message: "Impossible de creer la session d'interview." },
      { status: apiResponse.status >= 400 ? apiResponse.status : 500 },
    );
  }

  return NextResponse.json(await apiResponse.json());
}
