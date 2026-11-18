import { Logger } from "@nestjs/common";
import type { PushSubscriptionInput } from "@cvforge/types";
import webPush, { WebPushError } from "web-push";
import type { PushSubscriptionsStore } from "./push-subscriptions.pg-store";

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  /** `mailto:` or https address push services can reach the sender at. */
  subject: string;
}

/** Null without both VAPID keys: the app then simply does not offer push. */
export function resolvePushConfig(
  env: NodeJS.ProcessEnv = process.env,
): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;

  return {
    privateKey,
    publicKey,
    subject:
      env.VAPID_SUBJECT?.trim() || env.APP_URL?.trim() || "https://jobspark.fr",
  };
}

/** What the service worker (`apps/web/public/sw.js`) reads. */
export interface PushPayload {
  title: string;
  body: string;
  /** Opened on click; relative to the app. */
  url: string;
  /** A newer push with the same tag replaces the previous one on screen. */
  tag: string;
}

export type SendPush = (
  subscription: PushSubscriptionInput,
  payload: string,
) => Promise<void>;

/** An alert older than this is no longer news: the push service drops it. */
const PUSH_TTL_SECONDS = 6 * 60 * 60;

/**
 * Pushes a notification to every browser the candidate enabled. Best effort:
 * the in-app notification is already written, a failed push costs nothing
 * but the buzz. Browsers that dropped their subscription are forgotten.
 */
export class PushNotifier {
  private readonly logger = new Logger(PushNotifier.name);
  private readonly send: SendPush | null;

  constructor(
    private readonly store: PushSubscriptionsStore,
    private readonly config: PushConfig | null,
    send?: SendPush,
  ) {
    this.send = config ? (send ?? webPushSender(config)) : null;
  }

  get publicKey(): string | null {
    return this.config?.publicKey ?? null;
  }

  /** How many browsers accepted it. */
  async notify(userEmail: string, payload: PushPayload): Promise<number> {
    if (!this.send) return 0;

    const subscriptions = await this.store.listByUserEmail(userEmail);
    const body = JSON.stringify(payload);
    let delivered = 0;

    for (const subscription of subscriptions) {
      try {
        await this.send(subscription, body);
        delivered += 1;
      } catch (error) {
        if (isGone(error)) {
          await this.store.removeEndpoint(subscription.endpoint);
        } else {
          this.logger.warn(`Push failed: ${String(error)}`);
        }
      }
    }

    return delivered;
  }
}

function isGone(error: unknown): boolean {
  return (
    error instanceof WebPushError &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

function webPushSender(config: PushConfig): SendPush {
  const vapidDetails = {
    privateKey: config.privateKey,
    publicKey: config.publicKey,
    subject: config.subject,
  };

  return async (subscription, payload) => {
    await webPush.sendNotification(subscription, payload, {
      TTL: PUSH_TTL_SECONDS,
      timeout: 10_000,
      urgency: "high",
      vapidDetails,
    });
  };
}
