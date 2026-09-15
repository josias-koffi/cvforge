import type { DocumentVersionSource } from "@cvforge/types"

/**
 * Id of the latest AI-produced version (versions come newest first from the API).
 * Editors re-key on it so a new generation or translation replaces the local draft,
 * while manual saves keep the editor mounted.
 */
export function latestAiVersionId(versions: { id: string; source: DocumentVersionSource }[]) {
  return versions.find((version) => version.source !== "manual_save")?.id
}
