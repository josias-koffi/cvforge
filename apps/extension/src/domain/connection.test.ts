import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  EXTENSION_SCOPE,
  maskSecret,
  parseToolJson,
  readAuthorizationResponse,
  readBalance,
} from "./connection";

const ISSUER = "https://api.example";
const redirect = (query: string) => `https://id.chromiumapp.org/?${query}`;

describe("EXTENSION_SCOPE", () => {
  it("asks for the extension preset and a refresh token, never profile writes", () => {
    const scopes = EXTENSION_SCOPE.split(" ");
    expect(scopes).toContain("offline_access");
    expect(scopes).toContain("credits:read");
    expect(scopes).not.toContain("profile:write");
  });
});

describe("maskSecret", () => {
  it("keeps the provider prefix and the last four characters", () => {
    expect(maskSecret("sk-or-v1-0123456789abcdef9f3a")).toBe("sk-or-…9f3a");
    expect(maskSecret("  abcdefghijklmnop  ")).toBe("…mnop");
  });

  it("shows nothing of a short secret", () => {
    expect(maskSecret("abc")).toBe("…");
  });
});

describe("readAuthorizationResponse", () => {
  const expected = { issuer: ISSUER, state: "s1" };

  it("returns the code when state and issuer match", () => {
    expect(
      readAuthorizationResponse(
        redirect(`code=c1&state=s1&iss=${ISSUER}`),
        expected,
      ),
    ).toBe("c1");
  });

  it.each([
    ["state", "code=c1&state=other"],
    ["issuer", "code=c1&state=s1&iss=https://evil.example"],
    ["denied", "error=access_denied&state=s1"],
    ["missing-code", "error=server_error&state=s1"],
  ])("refuses a response with a bad %s", (reason, query) => {
    try {
      readAuthorizationResponse(redirect(query), expected);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError);
      expect((error as AuthorizationError).reason).toBe(reason);
    }
  });
});

describe("parseToolJson", () => {
  it("reads plain and untrusted-wrapped JSON", () => {
    expect(
      parseToolJson({ content: [{ text: '{"a":1}', type: "text" }] }),
    ).toEqual({ a: 1 });
    expect(
      parseToolJson({
        content: [
          {
            text: "<untrusted_offer_content>\n[1]\n</untrusted_offer_content>",
            type: "text",
          },
        ],
      }),
    ).toEqual([1]);
  });

  it("throws the tool's message on an error result", () => {
    expect(() =>
      parseToolJson({
        content: [{ text: "Plafond atteint", type: "text" }],
        isError: true,
      }),
    ).toThrow("Plafond atteint");
  });
});

describe("readBalance", () => {
  it("reads a numeric balance and refuses anything else", () => {
    expect(readBalance({ balance: 42 })).toBe(42);
    expect(readBalance({ balance: "x" })).toBeNull();
    expect(readBalance(null)).toBeNull();
  });
});
