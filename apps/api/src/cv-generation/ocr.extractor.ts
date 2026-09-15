import { copyFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createWorker, OEM } from "tesseract.js";

const OCR_LANGUAGES = ["fra", "eng"] as const;

let langPathPromise: Promise<string> | undefined;

// Trained data ships with the @tesseract.js-data packages so the server never downloads models at runtime.
// tesseract.js takes a single langPath (its `{ code, data }` form is broken in v7), so the per-language
// files are gathered into one directory once per process.
function prepareLangPath() {
  langPathPromise ??= (async () => {
    const langPath = join(tmpdir(), "cvforge-tessdata");
    await mkdir(langPath, { recursive: true });
    await Promise.all(
      OCR_LANGUAGES.map((code) =>
        copyFile(
          join(dirname(require.resolve(`@tesseract.js-data/${code}/package.json`)), "4.0.0_best_int", `${code}.traineddata.gz`),
          join(langPath, `${code}.traineddata.gz`),
        ),
      ),
    );

    return langPath;
  })().catch((error: unknown) => {
    langPathPromise = undefined;
    throw error;
  });

  return langPathPromise;
}

/** Runs OCR locally (ADR-009): scanned CV images never leave the server, the text is pseudonymised afterwards. */
export async function recognizeImages(images: Buffer[]): Promise<string> {
  if (images.length === 0) {
    return "";
  }

  const worker = await createWorker([...OCR_LANGUAGES], OEM.LSTM_ONLY, {
    cacheMethod: "none",
    gzip: true,
    langPath: await prepareLangPath(),
  });

  try {
    const pages: string[] = [];
    for (const image of images) {
      const { data } = await worker.recognize(image);
      pages.push(data.text);
    }

    return pages.join("\n").trim();
  } finally {
    await worker.terminate();
  }
}
