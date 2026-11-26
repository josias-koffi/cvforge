// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachFile, findFileInputs } from "./attach";

const bytes = new TextEncoder().encode("%PDF-1.4 test");
const doc = (kind: "cv" | "letter", extra = {}) => ({
  bytes,
  kind,
  name: kind === "cv" ? "CV Camille Test.pdf" : "Lettre Camille Test.pdf",
  type: "application/pdf",
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  document.body.innerHTML = "";
});

describe("attachFile", () => {
  it("puts the CV into the CV field, not the letter's, and the page sees it", async () => {
    document.body.innerHTML = `
      <form>
        <div><span>CV / Curriculum vitae *</span><input id="cv" type="file"></div>
        <div><span>Lettre de motivation</span><input id="letter" type="file"></div>
      </form>`;
    const changed = vi.fn();
    document.getElementById("cv")!.addEventListener("change", changed);

    const result = await attachFile(doc("cv"));

    expect(result).toMatchObject({ method: "input", ok: true });
    expect(changed).toHaveBeenCalled();
    const [cv, letter] = findFileInputs();
    expect(cv!.files?.[0]?.name).toBe("CV Camille Test.pdf");
    expect(letter!.files?.length ?? 0).toBe(0);
  });

  it("takes the letter field for the letter", async () => {
    document.body.innerHTML = `
      <div><label for="a">Resume</label><input id="a" type="file"></div>
      <div><label for="b">Cover letter</label><input id="b" type="file"></div>`;
    await attachFile(doc("letter"));
    expect(findFileInputs()[1]!.files?.[0]?.name).toBe(
      "Lettre Camille Test.pdf",
    );
  });

  it("uses the only file field of a form even without a label", async () => {
    document.body.innerHTML = `<input type="file">`;
    expect(await attachFile(doc("cv"))).toMatchObject({ ok: true });
  });

  it("never puts the letter into the only field, labelled for the CV", async () => {
    document.body.innerHTML = `<div><span>Resume/CV *</span><input type="file"></div>`;
    expect(await attachFile(doc("cv"))).toMatchObject({ ok: true });
    expect(await attachFile(doc("letter"))).toMatchObject({ ok: false });
    expect(findFileInputs()[0]!.files?.[0]?.name).toBe("CV Camille Test.pdf");
  });

  it("never overwrites a file already in a field with the letter", async () => {
    document.body.innerHTML = `<div><span>Pièces jointes</span><input type="file"></div>`;
    await attachFile(doc("cv"));
    expect(await attachFile(doc("letter"))).toMatchObject({ ok: false });
    expect(findFileInputs()[0]!.files?.[0]?.name).toBe("CV Camille Test.pdf");
  });

  it("finds fields inside open shadow roots", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    host.attachShadow({ mode: "open" }).innerHTML =
      `<label>CV <input type="file"></label>`;
    expect(await attachFile(doc("cv"))).toMatchObject({ ok: true });
  });

  it("drops the letter on a drop zone that shows the file", async () => {
    // happy-dom's DragEvent drops `dataTransfer`; Chrome's keeps it.
    vi.stubGlobal(
      "DragEvent",
      class extends Event {
        readonly dataTransfer: DataTransfer | null;
        constructor(type: string, init: DragEventInit = {}) {
          super(type, init);
          this.dataTransfer = init.dataTransfer ?? null;
        }
      },
    );
    document.body.innerHTML = `
      <div class="dropzone">Lettre de motivation : glissez votre fichier<span id="n"></span></div>`;
    document.querySelector(".dropzone")!.addEventListener("drop", (event) => {
      document.getElementById("n")!.textContent = (
        event as DragEvent
      ).dataTransfer!.files[0]!.name;
    });
    expect(await attachFile(doc("letter"))).toMatchObject({
      method: "drop",
      ok: true,
    });
    vi.unstubAllGlobals();
  });

  it("says when nothing on the page takes a file", async () => {
    document.body.innerHTML = `<p>Pas de champ</p>`;
    expect(await attachFile(doc("cv"))).toMatchObject({
      ok: false,
      reason: "aucun champ de fichier sur la page",
    });
  });

  it("refuses to guess between unlabelled fields", async () => {
    document.body.innerHTML = `<input type="file"><input type="file">`;
    expect(await attachFile(doc("cv"))).toMatchObject({
      ok: false,
      reason: "aucun champ ne correspond à ce document",
    });
  });
});
