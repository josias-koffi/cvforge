import { describe, expect, it } from "vitest";
import {
  clientIp,
  PROXY_SECRET_HEADER,
  RELAYED_CLIENT_IP_HEADER,
} from "./client-ip";

const SECRET = "landing-secret";

function relayed(secret: string, ip = "203.0.113.7") {
  return {
    headers: {
      [PROXY_SECRET_HEADER]: secret,
      [RELAYED_CLIENT_IP_HEADER]: ip,
      // What Traefik leaves once it has overwritten the landing's header.
      "x-forwarded-for": "172.18.0.1",
    },
  };
}

describe("clientIp", () => {
  it("believes the landing's relayed address when the secret matches", () => {
    expect(clientIp(relayed(SECRET), SECRET)).toBe("203.0.113.7");
  });

  it("ignores the relayed address when the secret is wrong", () => {
    expect(clientIp(relayed("guess"), SECRET)).toBe("172.18.0.1");
  });

  it("ignores it when a secret of another length is sent", () => {
    expect(clientIp(relayed(`${SECRET}x`), SECRET)).toBe("172.18.0.1");
  });

  /** No secret configured means nobody can vouch: the header proves nothing. */
  it("ignores it altogether when the API has no secret", () => {
    expect(clientIp(relayed(""), undefined)).toBe("172.18.0.1");
    expect(clientIp(relayed(""), "  ")).toBe("172.18.0.1");
  });

  it("ignores a matching secret that relays no address", () => {
    const request = relayed(SECRET);
    delete (request.headers as Record<string, string>)[
      RELAYED_CLIENT_IP_HEADER
    ];

    expect(clientIp(request, SECRET)).toBe("172.18.0.1");
  });

  it("ignores a relayed value that is not an address", () => {
    expect(clientIp(relayed(SECRET, "not-an-ip"), SECRET)).toBe("172.18.0.1");
  });

  it("accepts a relayed IPv6 address", () => {
    expect(clientIp(relayed(SECRET, "2001:db8::1"), SECRET)).toBe(
      "2001:db8::1",
    );
  });

  it("reads the first hop of X-Forwarded-For otherwise", () => {
    expect(
      clientIp(
        { headers: { "x-forwarded-for": ["198.51.100.4, 10.0.0.1"] } },
        undefined,
      ),
    ).toBe("198.51.100.4");
  });

  it("falls back to request.ip, then the socket, then a shared bucket", () => {
    expect(clientIp({ headers: {}, ip: "198.51.100.5" }, undefined)).toBe(
      "198.51.100.5",
    );
    expect(
      clientIp(
        { headers: {}, socket: { remoteAddress: "198.51.100.6" } },
        undefined,
      ),
    ).toBe("198.51.100.6");
    expect(clientIp({ headers: {} }, undefined)).toBe("unknown");
  });
});
