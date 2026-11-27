import type { AiKeySettings, JobSparkTools } from "./session";

/** Who answers the in-page agent's model calls during a fill. */
export type ModelRoute =
  | { kind: "personal"; baseURL: string; apiKey: string }
  | { kind: "jobspark"; baseURL: string; sessionId: string };

/**
 * The model calls of page-agent, relayed by the service worker (ADR-034):
 * the candidate's own key, or JobSpark's relay paid in credits (US-202).
 * Neither key nor token ever reaches the recruiter's page.
 */
export class ModelRelay {
  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      relay: { origin: string; accessToken: () => Promise<string | null> };
      fetchFn?: typeof fetch;
    },
  ) {}

  /**
   * The candidate's own key when set (free); otherwise a JobSpark fill
   * session, two credits, opened only now that everything else is ready.
   */
  async route(
    aiKey: AiKeySettings | null,
    applicationId: string,
  ): Promise<ModelRoute> {
    if (aiKey) {
      return { apiKey: aiKey.apiKey, baseURL: aiKey.baseURL, kind: "personal" };
    }
    const started = (await this.deps.tools.call("start_form_fill", {
      applicationId,
    })) as { fillSessionId: string };
    return {
      baseURL: `${this.deps.relay.origin}/agent/llm`,
      kind: "jobspark",
      sessionId: started.fillSessionId,
    };
  }

  async call(route: ModelRoute, request: { url: string; body?: string }) {
    if (!request.url.startsWith(`${route.baseURL}/`)) {
      return { error: "Adresse du modèle non autorisée." };
    }
    const send = async () => {
      const authorization =
        route.kind === "personal"
          ? `Bearer ${route.apiKey}`
          : `Bearer ${(await this.deps.relay.accessToken()) ?? ""}`;
      return (this.deps.fetchFn ?? ((u, i) => fetch(u, i)))(request.url, {
        body: request.body,
        headers: {
          authorization,
          "content-type": "application/json",
          ...(route.kind === "jobspark" && {
            "x-jobspark-fill-session": route.sessionId,
          }),
        },
        method: "POST",
      });
    };
    let response = await send();
    if (response.status === 401 && route.kind === "jobspark") {
      // The access token expired mid-fill: any MCP call refreshes it.
      await this.deps.tools.call("get_credit_balance").catch(() => undefined);
      response = await send();
    }
    return { body: await response.text(), status: response.status };
  }
}
