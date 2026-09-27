/**
 * Lowercase, accent-free, punctuation collapsed to single spaces.
 *
 * Every keyword match in the job search runs through this: a recruiter writes
 * "Développeur", a candidate types "developpeur", and both have to fold to the
 * same string before anything is compared.
 */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
