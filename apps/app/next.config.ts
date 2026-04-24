import path from "node:path";

function resolveNextDistDir(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || path.isAbsolute(trimmed)) {
    return undefined;
  }

  const normalized = trimmed.replaceAll("\\", "/");

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return undefined;
  }

  return normalized;
}

const nextDistDir = resolveNextDistDir(process.env.NEXT_DIST_DIR);

const nextConfig = {
  ...(nextDistDir ? { distDir: nextDistDir } : {}),
  transpilePackages: ["@puckeditor/core"],
};

export default nextConfig;
