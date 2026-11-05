import { describe, expect, it } from "vitest";
import { assertDocxIsNotABomb, assertFileMatchesKind } from "./cv-file-guard";

/** A one-entry stored zip whose central directory declares `declaredSize` once unpacked. */
function zip(declaredSize: number, entries = 1) {
  const name = Buffer.from("word/document.xml");
  const local = Buffer.alloc(30 + name.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(name.length, 26);
  name.copy(local, 30);

  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt32LE(declaredSize, 24);
  central.writeUInt16LE(name.length, 28);
  name.copy(central, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries, 10);
  eocd.writeUInt32LE(central.length * entries, 12);
  eocd.writeUInt32LE(local.length, 16);

  return Buffer.concat([local, ...Array.from({ length: entries }, () => central), eocd]);
}

describe("assertDocxIsNotABomb", () => {
  it("should accept an ordinary archive", () => {
    expect(() => assertDocxIsNotABomb(zip(50_000))).not.toThrow();
  });

  it("should refuse an entry that unpacks to too much", () => {
    expect(() => assertDocxIsNotABomb(zip(900 * 1024 * 1024))).toThrow(/volumineux/);
  });

  it("should refuse many medium entries that add up", () => {
    expect(() => assertDocxIsNotABomb(zip(10 * 1024 * 1024, 5))).toThrow(/volumineux/);
  });

  it("should refuse an absurd number of entries", () => {
    expect(() => assertDocxIsNotABomb(zip(10, 3_000))).toThrow(/trop d'elements/);
  });

  it("should refuse something that is not a zip", () => {
    expect(() => assertDocxIsNotABomb(Buffer.from("hello"))).toThrow(/corrompu/);
    expect(() => assertDocxIsNotABomb(zip(10).subarray(0, 40))).toThrow(/corrompu/);
  });
});

describe("assertFileMatchesKind", () => {
  it("should check the bytes, not the name", () => {
    expect(() => assertFileMatchesKind(Buffer.from("%PDF-1.7\n..."), "pdf")).not.toThrow();
    expect(() => assertFileMatchesKind(Buffer.from("<html>"), "pdf")).toThrow(/PDF/);
    expect(() => assertFileMatchesKind(zip(10), "docx")).not.toThrow();
    expect(() => assertFileMatchesKind(Buffer.from("%PDF-1.7"), "docx")).toThrow(/DOCX/);
  });
});
