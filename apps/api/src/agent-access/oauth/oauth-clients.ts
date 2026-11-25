import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { SafeFetchResult } from "../../shared/safe-fetch";
import { isAllowedRedirectUri } from "./oauth-rules";
import type { OAuthClientRecord, OAuthStore } from "./oauth.pg-store";

const CIMD_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_REDIRECT_URIS = 10;
const MAX_NAME_LENGTH = 80;

export type OAuthClient = Pick<
  OAuthClientRecord,
  "clientId" | "clientName" | "kind" | "redirectUris"
>;

export type CimdFetcher = (url: string) => Promise<SafeFetchResult>;

/** An RFC 7591 registration request, as much of it as we read. */
export type ClientRegistration = {
  redirect_uris?: unknown;
  client_name?: unknown;
};

export class OAuthClientError extends Error {}

function readName(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, MAX_NAME_LENGTH)
    : fallback;
}

function readRedirectUris(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_REDIRECT_URIS ||
    !value.every((uri) => typeof uri === "string" && isAllowedRedirectUri(uri))
  ) {
    throw new OAuthClientError(
      "redirect_uris doit lister des adresses https ou loopback (127.0.0.1, localhost).",
    );
  }

  return value as string[];
}

/** A CIMD client_id: an https URL with a path (MCP authorization, 2025-11-25). */
export function isMetadataDocumentUrl(clientId: string) {
  try {
    const url = new URL(clientId);
    return url.protocol === "https:" && url.pathname.length > 1 && !url.hash;
  } catch {
    return false;
  }
}

/**
 * Who is asking for a token (ADR-033 §3): a client that published its
 * metadata at the URL it uses as `client_id` (CIMD, what Claude and ChatGPT
 * prefer), or one that registered itself (DCR, the fallback).
 */
export class OAuthClients {
  private readonly logger = new Logger(OAuthClients.name);

  constructor(
    private readonly store: OAuthStore,
    private readonly fetchDocument: CimdFetcher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** The client, or null when it is unknown or its document unusable. */
  async resolve(clientId: unknown): Promise<OAuthClient | null> {
    if (typeof clientId !== "string" || !clientId || clientId.length > 2048) {
      return null;
    }

    const stored = await this.store.findClient(clientId);

    if (!isMetadataDocumentUrl(clientId)) {
      return stored;
    }

    const fresh =
      stored?.fetchedAt &&
      this.now().getTime() - stored.fetchedAt.getTime() < CIMD_CACHE_MS;

    return fresh ? stored : this.fetchMetadata(clientId, stored);
  }

  async register(request: ClientRegistration): Promise<OAuthClient> {
    const client: OAuthClient = {
      clientId: randomUUID(),
      clientName: readName(request.client_name, "Agent MCP"),
      kind: "dcr",
      redirectUris: readRedirectUris(request.redirect_uris),
    };

    await this.store.saveClient({ ...client, fetchedAt: null });

    return client;
  }

  private async fetchMetadata(
    clientId: string,
    stored: OAuthClientRecord | null,
  ): Promise<OAuthClient | null> {
    try {
      const response = await this.fetchDocument(clientId);
      const document = JSON.parse(response.text) as Record<string, unknown>;

      if (response.status !== 200 || document.client_id !== clientId) {
        throw new OAuthClientError(
          "client_id du document différent de son adresse.",
        );
      }

      const client: OAuthClient = {
        clientId,
        clientName: readName(document.client_name, new URL(clientId).hostname),
        kind: "cimd",
        redirectUris: readRedirectUris(document.redirect_uris),
      };

      await this.store.saveClient({ ...client, fetchedAt: this.now() });

      return client;
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          clientId,
          error: error instanceof Error ? error.message : String(error),
          event: "oauth_cimd_unusable",
        }),
      );

      // A document that cannot be read now keeps its last good copy.
      return stored;
    }
  }
}
