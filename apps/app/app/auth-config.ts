function normalizeUrl(value: string) {
  return value.replace(
    /\/$/,
    "",
  );
}

export function getAppUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}

export function getPublicApiUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333");
}

export function getServerApiUrl() {
  return normalizeUrl(
    process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3333",
  );
}
