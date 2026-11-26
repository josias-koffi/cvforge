const CHUNK = 0x8000;

/** Bytes as base64, in chunks: a whole PDF spread into one call overflows the stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Downloads a JobSpark signed link from the service worker (host_permissions,
 * no CORS): the document never goes through a third party (ADR-034 §5).
 */
export function signedFileDownloader(
  fetchFn: typeof fetch = (u, i) => fetch(u, i),
) {
  return async (url: string) => {
    const response = await fetchFn(url);
    if (!response.ok)
      throw new Error(
        `Téléchargement du document impossible (${response.status}).`,
      );
    const mime =
      response.headers.get("content-type")?.split(";")[0] || "application/pdf";
    return {
      base64: toBase64(new Uint8Array(await response.arrayBuffer())),
      mime,
    };
  };
}
