import { describe, expect, it } from "vitest";
import { SIGNED_FILE_TTL_MS, SignedFiles } from "./signed-files";

const claim = {
  applicationId: "app-1",
  format: "pdf" as const,
  kind: "cv" as const,
  userEmail: "user@example.com",
};

function tokenOf(url: string) {
  return url.split("/mcp/files/")[1];
}

describe("SignedFiles", () => {
  it("issues a link under the API URL that works exactly once", () => {
    const files = new SignedFiles("secret", "https://api.example/", () => 0);
    const { url } = files.issue(claim);

    expect(url.startsWith("https://api.example/mcp/files/")).toBe(true);
    expect(files.redeem(tokenOf(url))).toMatchObject(claim);
    expect(files.redeem(tokenOf(url))).toBeNull();
  });

  it("refuses an expired, tampered or foreign link", () => {
    let now = 0;
    const files = new SignedFiles("secret", "https://api.example", () => now);
    const expired = tokenOf(files.issue(claim).url);
    now = SIGNED_FILE_TTL_MS;
    expect(files.redeem(expired)).toBeNull();

    const [payload, signature] = tokenOf(files.issue(claim).url).split(".");
    const forged = Buffer.from(
      JSON.stringify({
        ...claim,
        expiresAt: now + 1000,
        nonce: "n",
        userEmail: "victim@example.com",
      }),
    ).toString("base64url");
    expect(files.redeem(`${forged}.${signature}`)).toBeNull();

    const other = new SignedFiles(
      "another-secret",
      "https://api.example",
      () => now,
    );
    expect(other.redeem(`${payload}.${signature}`)).toBeNull();
    expect(files.redeem("garbage")).toBeNull();
  });
});
