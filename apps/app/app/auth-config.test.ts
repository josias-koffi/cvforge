import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl, getPublicApiUrl, getServerApiUrl } from "./auth-config";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.API_INTERNAL_URL;
});

describe("auth config", () => {
  it("should default to the local API URL", () => {
    expect(getPublicApiUrl()).toBe("http://localhost:3333");
    expect(getServerApiUrl()).toBe("http://localhost:3333");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("should trim a trailing slash for the public API URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/";

    expect(getPublicApiUrl()).toBe("https://api.example.test");
  });

  it("should prefer the internal API URL for server-side calls", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";
    process.env.API_INTERNAL_URL = "http://api:3333/";

    expect(getServerApiUrl()).toBe("http://api:3333");
  });

  it("should trim a trailing slash for the app URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";

    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
