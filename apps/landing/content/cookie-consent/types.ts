/**
 * The cookie banner and its "manage cookies" link. Kept apart from `types.ts`,
 * like its wording from `fr.ts` and `en.ts`.
 */
export interface CookieConsentDictionary {
  title: string
  /** Before the link to the privacy policy. */
  body: string
  privacyLink: string
  accept: string
  refuse: string
  /** The footer link that opens the banner again. */
  manage: string
}
