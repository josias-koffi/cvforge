import { cookies } from "next/headers";
import { getServerApiUrl } from "../../../auth-config";

type RespondRouteProps = {
  params: Promise<{ sessionId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function GET(_request: Request, { params }: RespondRouteProps) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const apiResponse = await fetch(
    `${getServerApiUrl()}/interviews/sessions/${sessionId}/respond`,
    {
      cache: "no-store",
      headers: {
        Accept: "text/event-stream",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    },
  );

  if (!apiResponse.ok || !apiResponse.body) {
    return new Response(
      JSON.stringify({ message: "Impossible de generer la reponse IA." }),
      { status: apiResponse.status >= 400 ? apiResponse.status : 500 },
    );
  }

  return new Response(apiResponse.body, {
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
