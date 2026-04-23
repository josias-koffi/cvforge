import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../../auth-config";

export async function GET(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/privacy/export`, {
    cache: "no-store",
    headers: request.headers.get("cookie")
      ? { cookie: request.headers.get("cookie") ?? "" }
      : undefined,
  });

  if (!response.ok) {
    return NextResponse.json({ error: "export_failed" }, { status: response.status });
  }

  return NextResponse.json(await response.json(), { status: 200 });
}
