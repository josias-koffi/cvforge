/** What a France Travail call returns, and how a raw response becomes it. */

/**
 * Why a call brought nothing back.
 *
 * - `disabled`: the API is not in `FRANCE_TRAVAIL_APIS`, or there are no credentials;
 * - `unsubscribed`: `invalid_scope` at token time, or a 403 on the call; off until restart;
 * - `auth`: any other token refusal, or a 401 that survived a fresh token;
 * - `rejected`: a 4xx on the call itself — `detail` names the parameter;
 * - `throttled`: 429 or 5xx on every attempt;
 * - `network`: the request never got an answer;
 * - `malformed`: a success whose body is not JSON.
 */
export type FtUnavailableReason =
  | "disabled"
  | "unsubscribed"
  | "auth"
  | "rejected"
  | "throttled"
  | "network"
  | "malformed";

/**
 * What every France Travail call returns. Nothing throws past the client: a
 * nightly job must be able to tell "nothing there" from "could not ask",
 * because only the first may remove anything.
 */
export type FtResult<T> =
  | { kind: "ok"; status: number; data: T }
  | { kind: "empty"; status: number }
  | {
      kind: "unavailable";
      status: number | null;
      reason: FtUnavailableReason;
      detail: string;
    };

const DETAIL_MAX_CHARS = 300;

export async function readJson<T>(response: Response): Promise<FtResult<T>> {
  try {
    return {
      data: (await response.json()) as T,
      kind: "ok",
      status: response.status,
    };
  } catch (error) {
    return unavailable("malformed", response.status, String(error));
  }
}

export async function readDetail(response: Response): Promise<string> {
  return (await response.text().catch(() => "")).slice(0, DETAIL_MAX_CHARS);
}

export function unavailable<T>(
  reason: FtUnavailableReason,
  status: number | null,
  detail: string,
): FtResult<T> {
  return { detail, kind: "unavailable", reason, status };
}
