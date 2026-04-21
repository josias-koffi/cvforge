import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  creditPackIds,
  type CreateCheckoutSessionRequest,
  type CreateCheckoutSessionResponse,
} from "@cvforge/types";
import { getAppUrl, getServerApiUrl } from "../../auth-config";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

function isCreditPackId(value: string): value is CreateCheckoutSessionRequest["packId"] {
  return (creditPackIds as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawPackId = String(formData.get("packId") ?? "").trim().toLowerCase();
  const redirectUrl = new URL("/dashboard", getAppUrl());

  if (!isCreditPackId(rawPackId)) {
    redirectUrl.searchParams.set("billing", "error");
    redirectUrl.searchParams.set("reason", "invalid_pack");

    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/billing/checkout-sessions`, {
    body: JSON.stringify({
      packId: rawPackId,
    } satisfies CreateCheckoutSessionRequest),
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    method: "POST",
  });

  if (!response.ok) {
    redirectUrl.searchParams.set("billing", "error");

    try {
      const data = (await response.json()) as { message?: string };
      redirectUrl.searchParams.set(
        "reason",
        typeof data.message === "string" && data.message
          ? data.message
          : "request_failed",
      );
    } catch {
      redirectUrl.searchParams.set("reason", "request_failed");
    }

    return NextResponse.redirect(redirectUrl);
  }

  const data = (await response.json()) as CreateCheckoutSessionResponse;

  return NextResponse.redirect(data.checkoutUrl);
}
