import { getPublicApiUrl } from "../../auth-config";

export type SessionPayload = {
  session: {
    email: string;
    expiresAt: string;
    role: string;
  };
};

export async function fetchSession(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`${getPublicApiUrl()}/auth/session`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Session introuvable.");
  }

  return (await response.json()) as SessionPayload;
}
