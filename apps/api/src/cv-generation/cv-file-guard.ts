import { BadRequestException, UnprocessableEntityException } from "@nestjs/common";

const MAX_DOCX_ENTRIES = 2_000;
const MAX_DOCX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_DOCX_TOTAL_BYTES = 40 * 1024 * 1024;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_MIN_LENGTH = 22;
const MAX_ZIP_COMMENT = 0xffff;

/** `%PDF-` within the first kilobyte, which is how readers themselves recognise one. */
export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes("%PDF-");
}

export function looksLikeZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
}

/**
 * A DOCX is a zip, and a few kilobytes of zip can inflate to gigabytes. Reads
 * the central directory (no decompression) and refuses an archive that claims
 * too many entries or too much once unpacked. The sizes declared there are
 * enforced by the unzipper, so a lying header fails there rather than here.
 */
export function assertDocxIsNotABomb(buffer: Buffer): void {
  const invalid = () => new UnprocessableEntityException("Le fichier DOCX est illisible ou corrompu.");

  if (!looksLikeZip(buffer)) {
    throw invalid();
  }

  const searchFrom = Math.max(0, buffer.length - EOCD_MIN_LENGTH - MAX_ZIP_COMMENT);
  let eocd = -1;

  for (let index = buffer.length - EOCD_MIN_LENGTH; index >= searchFrom; index -= 1) {
    if (buffer.readUInt32LE(index) === EOCD_SIGNATURE) {
      eocd = index;
      break;
    }
  }

  if (eocd < 0) {
    throw invalid();
  }

  const entries = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);

  // Zip64 markers: no office document needs them.
  if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    throw invalid();
  }

  if (entries > MAX_DOCX_ENTRIES) {
    throw new UnprocessableEntityException("Le fichier DOCX contient trop d'elements.");
  }

  let cursor = directoryOffset;
  let total = 0;

  for (let seen = 0; seen < entries; seen += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw invalid();
    }

    const size = buffer.readUInt32LE(cursor + 24);

    if (size === 0xffffffff || size > MAX_DOCX_ENTRY_BYTES) {
      throw new UnprocessableEntityException("Le fichier DOCX est trop volumineux une fois decompresse.");
    }

    total += size;

    if (total > MAX_DOCX_TOTAL_BYTES) {
      throw new UnprocessableEntityException("Le fichier DOCX est trop volumineux une fois decompresse.");
    }

    cursor +=
      46 + buffer.readUInt16LE(cursor + 28) + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
}

/** The extension and declared type come from the client: check the bytes agree. */
export function assertFileMatchesKind(buffer: Buffer, kind: "pdf" | "docx"): void {
  const ok = kind === "pdf" ? looksLikePdf(buffer) : looksLikeZip(buffer);

  if (!ok) {
    throw new BadRequestException(
      kind === "pdf" ? "Ce fichier n'est pas un PDF valide." : "Ce fichier n'est pas un DOCX valide.",
    );
  }
}
