import { siteOf } from "../domain/submission";

/**
 * On an offer page, the way to its application form (« Postuler », « Apply »),
 * so « Remplir » can open the form itself. Runs in the page.
 */

const APPLY_TEXT =
  /\b(postuler|je postule|candidater|déposer (ma|une) candidature|apply( now| for this job)?)\b/i;
const THIRD_PARTY = /\b(linkedin|indeed|google|facebook|apple|seek|xing)\b/i;
const FORM_FIELDS =
  'input:not([type="hidden"]):not([type="search"]):not([type="submit"]):not([type="button"]), textarea, select';

/** Fields a candidate would fill: a page with a few is already the form. */
export function formFieldCount(): number {
  return [...document.querySelectorAll<HTMLElement>(FORM_FIELDS)].filter(
    (field) =>
      (field as HTMLInputElement).type === "file" ||
      field.getClientRects().length > 0,
  ).length;
}

/** The same-site link to the application form, the most specific first. */
export function findApplyLink(): string | null {
  const here = new URL(location.href);
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .filter((link) => {
      const text = (link.textContent ?? "").replace(/\s+/g, " ").trim();
      return APPLY_TEXT.test(text) && !THIRD_PARTY.test(text);
    })
    .map((link) => new URL(link.href, here))
    .filter(
      (url) =>
        /^https?:$/.test(url.protocol) &&
        siteOf(url.host) === siteOf(here.host) &&
        url.href.split("#")[0] !== here.href.split("#")[0],
    );
  const deeper = links.find((url) => url.pathname.startsWith(here.pathname));
  return (deeper ?? links[0])?.href ?? null;
}
