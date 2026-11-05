import { describe, expect, it } from "vitest";
import { isPlainEmailAddress } from "./email-address";

describe("isPlainEmailAddress", () => {
  it.each([
    "user@example.com",
    "first.last+tag@sub.example.co.uk",
    "o'brien@example.fr",
    "a_b-c@ex-ample.org",
    "USER@EXAMPLE.COM",
  ])("should accept %s", (address) => {
    expect(isPlainEmailAddress(address)).toBe(true);
  });

  it.each([
    "a@x.com,b@y.com",
    "a@x.com;b@y.com",
    "a@x.com b@y.com",
    "Name <a@x.com>",
    '"a b"@example.com',
    "a@x.com\r\nBcc: v@y.com",
    "a@@x.com",
    "a@x",
    "a@x.c",
    "@example.com",
    "user@-bad.com",
    "user@bad-.com",
    ".user@example.com",
    "us..er@example.com",
    "user@exa mple.com",
    "utilisateur@exämple.com",
    `${"a".repeat(65)}@example.com`,
    `a@${"b".repeat(250)}.com`,
    "",
  ])("should refuse %j", (address) => {
    expect(isPlainEmailAddress(address)).toBe(false);
  });
});
