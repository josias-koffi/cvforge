// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clickSubmit, findSubmitControl, readForm } from "./form-state";

// happy-dom lays nothing out: treat every element as visible.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {} as DOMRect,
  ] as unknown as DOMRectList);
});

describe("readForm", () => {
  it("reads every field as the candidate sees it, never passwords or hidden ones", () => {
    document.body.innerHTML = `
      <form>
        <label for="n">Nom *</label><input id="n" value="Camille Test" required>
        <input aria-label="E-mail" type="email" value="c@example.com">
        <input type="password" aria-label="Mot de passe" value="secret">
        <input type="hidden" name="token" value="x">
        <label>Pays <select><option value="">—</option><option selected value="fr">France</option></select></label>
        <label><input type="checkbox" checked> J'accepte d'être recontacté</label>
        <label><input type="radio" name="remote" value="y"> Oui</label>
        <label><input type="radio" name="remote" value="n" checked> Non</label>
        <textarea aria-label="Motivation">Parce que.</textarea>
        <button type="submit">Envoyer ma candidature</button>
      </form>`;

    const form = readForm();

    expect(form.fields).toEqual([
      { label: "Nom", value: "Camille Test" },
      { label: "E-mail", value: "c@example.com" },
      { label: "Pays", value: "France" },
      { label: "J'accepte d'être recontacté", value: "Oui" },
      { label: "remote", value: "Non" },
      { label: "Motivation", value: "Parce que." },
    ]);
    expect(JSON.stringify(form)).not.toContain("secret");
    expect(form.requiredEmpty).toEqual([]);
    expect(form.submitLabel).toBe("Envoyer ma candidature");
    expect(form.multiStep).toBe(false);
  });

  it("names a hidden file field after the block around it", () => {
    document.body.innerHTML = `
      <div><span>CV / Curriculum vitae</span><button type="button">Choisir</button>
        <input type="file" style="display:none"></div>`;
    const input = document.querySelector("input")!;
    const transfer = new DataTransfer();
    transfer.items.add(new File(["x"], "CV Camille.pdf"));
    Object.defineProperty(input, "files", { value: transfer.files });
    expect(readForm().fields).toEqual([
      { label: "CV / Curriculum vitae", value: "CV Camille.pdf" },
    ]);
  });

  it("lists required fields left empty", () => {
    document.body.innerHTML = `
      <label for="p">Téléphone *</label><input id="p" required>
      <input aria-label="Ville" aria-required="true">
      <input type="radio" name="visa" required aria-label="Visa">
      <button type="submit">Submit</button>`;
    expect(readForm().requiredEmpty).toEqual(["Téléphone", "Ville", "visa"]);
  });

  it("spots a form whose visible button only goes to the next step", () => {
    document.body.innerHTML = `<input aria-label="Nom"><button>Suivant</button>`;
    expect(readForm()).toMatchObject({ multiStep: true, submitLabel: null });
  });
});

describe("findSubmitControl / clickSubmit", () => {
  it("clicks the one final button", () => {
    document.body.innerHTML = `<button>Annuler</button><button type="submit">Postuler</button>`;
    const clicked = vi.fn();
    document.querySelector("[type=submit]")!.addEventListener("click", clicked);
    expect(clickSubmit()).toEqual({ clicked: true, label: "Postuler" });
    expect(clicked).toHaveBeenCalled();
  });

  it("prefers the explicit submit among several candidates", () => {
    document.body.innerHTML = `
      <button>Postuler avec LinkedIn</button>
      <button type="submit">Envoyer</button>`;
    expect(findSubmitControl()?.textContent).toBe("Envoyer");
  });

  it("ignores a hidden submit button beside the visible one (Lever, hCaptcha)", () => {
    document.body.innerHTML = `
      <button type="submit" id="hcaptchaSubmitBtn" class="hidden"></button>
      <button type="button" id="btn-submit">SUBMIT APPLICATION</button>`;
    vi.mocked(HTMLElement.prototype.getClientRects).mockImplementation(
      function (this: HTMLElement) {
        return (this.id === "hcaptchaSubmitBtn"
          ? []
          : [{} as DOMRect]) as unknown as DOMRectList;
      },
    );
    expect(findSubmitControl()?.id).toBe("btn-submit");
  });

  it("does not guess between two submit buttons, nor click a disabled one", () => {
    document.body.innerHTML = `
      <button type="submit">Envoyer</button><button type="submit">Submit application</button>`;
    expect(clickSubmit()).toMatchObject({ clicked: false });
    document.body.innerHTML = `<button type="submit" disabled>Envoyer</button>`;
    expect(findSubmitControl()).toBeNull();
  });
});
