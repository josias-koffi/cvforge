import { FtHttpClient } from "./ft-http.client";
import type { FtResult } from "./ft-result";
import { resolveFtConfig, type FtApiId } from "./ft.config";

type FetchLike = typeof globalThis.fetch;

const MAX_KEYS_SHOWN = 12;

/**
 * One token and one read call against a single API, whatever
 * `FRANCE_TRAVAIL_APIS` says: the point is to prove an API works *before*
 * listing it there. ADR-024 makes this the only judge of a contract.
 */
export async function smokeFtApi(
  id: FtApiId,
  env: NodeJS.ProcessEnv,
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<string[]> {
  const config = resolveFtConfig({ ...env, FRANCE_TRAVAIL_APIS: id });
  const api = config.apis[id];
  const header = `${id} — ${api.label}${api.verified ? "" : " (non vérifiée)"}`;

  if (!config.hasCredentials) {
    return [
      header,
      "  ⚠️ FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET sont requis.",
    ];
  }

  const client = new FtHttpClient(config, fetchImpl);
  const startedAt = Date.now();
  const result = await client.request<unknown>(id, {
    ...api.smoke,
    attempts: 1,
  });

  return [
    header,
    `  scope : ${api.scope}`,
    `  appel : ${api.smoke.method} ${api.baseUrl}${api.smoke.path}`,
    ...describeResult(result, Date.now() - startedAt),
  ];
}

/** Status, then the shape of the answer: what a contract check needs to read. */
export function describeResult(
  result: FtResult<unknown>,
  elapsedMs: number,
): string[] {
  if (result.kind === "empty") {
    return [`  ✅ ${result.status} en ${elapsedMs} ms — réponse vide`];
  }

  if (result.kind === "unavailable") {
    return [
      `  ❌ ${result.reason} (${result.status ?? "pas de réponse"}) en ${elapsedMs} ms`,
      `  ${result.detail}`,
    ];
  }

  return [
    `  ✅ ${result.status} en ${elapsedMs} ms`,
    `  ${describeShape(result.data)}`,
  ];
}

export function describeShape(data: unknown): string {
  if (Array.isArray(data)) {
    const first: unknown = data[0];
    return `tableau de ${data.length} élément(s)${
      isRecord(first) ? ` ; clés du premier : ${listKeys(first)}` : ""
    }`;
  }

  if (isRecord(data)) return `clés : ${listKeys(data)}`;

  return `valeur : ${JSON.stringify(data)?.slice(0, 120)}`;
}

function listKeys(record: Record<string, unknown>): string {
  const keys = Object.keys(record);
  const shown = keys.slice(0, MAX_KEYS_SHOWN).map((key) => {
    const value = record[key];
    return Array.isArray(value) ? `${key}[${value.length}]` : key;
  });

  return keys.length > MAX_KEYS_SHOWN
    ? `${shown.join(", ")} … (+${keys.length - MAX_KEYS_SHOWN})`
    : shown.join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
