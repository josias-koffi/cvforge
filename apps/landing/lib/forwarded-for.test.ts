import { describe, expect, it } from "vitest"

import { forwardedFor } from "./forwarded-for"

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3101/api/ats-scan", {
    headers,
    method: "POST",
  })
}

/**
 * The visitor's address, forwarded deliberately: the API rate-limits the scan
 * per IP, so without this every visitor would arrive as this server and share
 * one bucket.
 */
describe("forwardedFor", () => {
  it("takes the first hop of X-Forwarded-For", () => {
    const headers = forwardedFor(
      makeRequest({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
    )

    expect(headers["x-forwarded-for"]).toBe("203.0.113.7")
    expect(headers["x-real-ip"]).toBe("203.0.113.7")
  })

  it("falls back to X-Real-IP", () => {
    const headers = forwardedFor(makeRequest({ "x-real-ip": "198.51.100.4" }))

    expect(headers["x-real-ip"]).toBe("198.51.100.4")
  })

  it("sends no address header when it knows none", () => {
    expect(forwardedFor(makeRequest())).toEqual({})
  })

  describe("behind an edge that names the client", () => {
    const env = {
      CLIENT_IP_HEADER: "CF-Connecting-IP",
    } as unknown as NodeJS.ProcessEnv

    it("reads the header the edge guarantees, whatever X-Forwarded-For says", () => {
      const headers = forwardedFor(
        makeRequest({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "198.51.100.66, 172.64.0.1",
        }),
        env
      )

      expect(headers["x-forwarded-for"]).toBe("203.0.113.7")
    })

    it("falls back to X-Forwarded-For when that header is missing", () => {
      const headers = forwardedFor(
        makeRequest({ "x-forwarded-for": "198.51.100.4" }),
        env
      )

      expect(headers["x-forwarded-for"]).toBe("198.51.100.4")
    })
  })

  describe("relayed to the API through its public host", () => {
    it("signs the relayed address when a secret is configured", () => {
      const headers = forwardedFor(
        makeRequest({ "x-forwarded-for": "203.0.113.7" }),
        { LANDING_PROXY_SECRET: "s3cret" } as unknown as NodeJS.ProcessEnv
      )

      expect(headers).toMatchObject({
        "x-cvforge-client-ip": "203.0.113.7",
        "x-cvforge-proxy-secret": "s3cret",
      })
    })

    it("relays nothing signed without a secret", () => {
      const headers = forwardedFor(
        makeRequest({ "x-forwarded-for": "203.0.113.7" }),
        {} as unknown as NodeJS.ProcessEnv
      )

      expect(headers).not.toHaveProperty("x-cvforge-proxy-secret")
    })
  })
})
