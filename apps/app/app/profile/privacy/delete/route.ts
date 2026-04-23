import { NextResponse } from "next/server";
import { getAppUrl, getAuthCookieName, getServerApiUrl } from "../../../auth-config";

function mapErrorCode(status: number) {
  switch (status) {
    case 400:
      return "confirmation_mismatch";
    case 401:
      return "session_required";
    default:
      return "delete_failed";
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${getServerApiUrl()}/privacy/delete-account`, {
    body: JSON.stringify({
      confirmationEmail: String(body.confirmationEmail ?? ""),
    }),
    headers: {
      ...(request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") ?? "" }
        : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: mapErrorCode(response.status) },
      { status: response.status },
    );
  }

  const result = NextResponse.json({
    redirectUrl: new URL("/login?accountDeleted=1", getAppUrl()).toString(),
    ...(await response.json()),
  });

  result.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: getAuthCookieName(),
    path: "/",
    sameSite: "lax",
    secure: getAppUrl().startsWith("https://"),
    value: "",
  });

  return result;
}
