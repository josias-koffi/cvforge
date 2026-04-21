import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerApiUrl } from "../../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const apiResponse = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/cv/pdf`,
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (!apiResponse.ok) {
    let message = "L'export PDF a echoue.";

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

  const pdf = await apiResponse.arrayBuffer();
  const contentDisposition =
    apiResponse.headers.get("content-disposition") ??
    `attachment; filename="cv-${applicationId}.pdf"`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": contentDisposition,
      "Content-Type":
        apiResponse.headers.get("content-type") ?? "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
