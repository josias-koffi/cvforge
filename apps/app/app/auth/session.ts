import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerApiUrl } from "../auth-config";

export type AppSession = {
  email: string;
  expiresAt: string;
  role: "admin" | "user";
};

type SessionResponse = {
  authenticated: true;
  session: AppSession;
};

async function fetchSession(endpoint: "/auth/session" | "/auth/session/admin") {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  let response: Response;

  try {
    response = await fetch(`${getServerApiUrl()}${endpoint}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
  } catch {
    redirect("/login?error=session_unavailable");
  }

  if (response.status === 401) {
    redirect("/login?error=session_required");
  }

  if (response.status === 403) {
    redirect("/forbidden");
  }

  if (response.status >= 500) {
    redirect("/login?error=session_unavailable");
  }

  if (!response.ok) {
    throw new Error("Impossible de verifier la session.");
  }

  const payload = (await response.json()) as SessionResponse;

  return payload.session;
}

export function requireSession() {
  return fetchSession("/auth/session");
}

export function requireAdminSession() {
  return fetchSession("/auth/session/admin");
}
