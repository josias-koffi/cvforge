import { getPublicApiUrl } from "../auth-config";
import {
  sanitizeBaseProfileRegistry,
  saveProfileRegistryToStorage,
  type BaseProfileRegistry,
} from "./base-profile";

export async function fetchRemoteProfileRegistry(
  sessionEmail: string,
): Promise<BaseProfileRegistry | null> {
  try {
    const response = await fetch(`${getPublicApiUrl()}/profiles`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { registry?: unknown };

    if (!data.registry) {
      return null;
    }

    return sanitizeBaseProfileRegistry(data.registry, sessionEmail);
  } catch {
    return null;
  }
}

export async function pushRemoteProfileRegistry(
  registry: BaseProfileRegistry,
): Promise<void> {
  try {
    await fetch(`${getPublicApiUrl()}/profiles`, {
      body: JSON.stringify({ registry }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
  } catch {
    // fire-and-forget — silencieux
  }
}

export async function syncProfileRegistryOnLoad(
  sessionEmail: string,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  localRegistry: BaseProfileRegistry,
  onRegistry: (registry: BaseProfileRegistry) => void,
): Promise<void> {
  const remoteRegistry = await fetchRemoteProfileRegistry(sessionEmail);

  if (remoteRegistry && remoteRegistry.profiles.length > 0) {
    onRegistry(remoteRegistry);
    saveProfileRegistryToStorage(remoteRegistry, storage);
  } else if (localRegistry.profiles.length > 0) {
    void pushRemoteProfileRegistry(localRegistry);
  }
}
