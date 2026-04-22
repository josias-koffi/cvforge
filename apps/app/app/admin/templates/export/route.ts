import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function GET() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/templates/export.csv`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Impossible d'exporter les templates admin." },
      { status: response.status >= 400 && response.status < 600 ? response.status : 500 },
    );
  }

  const body = await response.text();

  return new NextResponse(body, {
    headers: {
      "Content-Disposition":
        response.headers.get("content-disposition") ??
        'attachment; filename="admin-templates-export.csv"',
      "Content-Type":
        response.headers.get("content-type") ?? "text/csv; charset=utf-8",
    },
  });
}
