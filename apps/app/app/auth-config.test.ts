import { describe, expect, it } from "vitest";
import { getApiUrl } from "./auth-config";

describe("getApiUrl", () => {
  it("should default to the local API URL", () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(getApiUrl()).toBe("http://localhost:3333");
  });

  it("should trim a trailing slash", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/";

    expect(getApiUrl()).toBe("https://api.example.test");
  });
});
