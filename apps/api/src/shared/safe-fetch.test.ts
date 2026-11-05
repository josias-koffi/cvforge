import { describe, expect, it } from "vitest";
import { BlockedUrlError, fetchPublicPage, isPrivateAddress } from "./safe-fetch";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "::ffff:127.0.0.1",
    "not-an-ip",
  ])("should treat %s as not public", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.216.34", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "should treat %s as public",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});

describe("fetchPublicPage", () => {
  it.each([
    "http://127.0.0.1/",
    "http://localhost/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://10.0.0.5/",
    "http://[::ffff:7f00:1]/",
    "ftp://example.com/file",
    "file:///etc/passwd",
    "http://example.com:6379/",
    "http://user:secret@example.com/",
    "not a url",
  ])("should refuse %s", async (url) => {
    await expect(fetchPublicPage(url, { timeoutMs: 3_000 })).rejects.toBeInstanceOf(BlockedUrlError);
  });
});
