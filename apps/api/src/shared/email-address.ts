const MAX_ADDRESS_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
// RFC 5322's "dot-atom" local part and plain LDH domain labels. Quoted strings,
// comments, display names, address lists (commas, semicolons) and angle
// brackets are all refused: a single bare mailbox is the only thing the app
// ever wants, and anything richer is how one request reaches several inboxes
// or smuggles a header into the mail library's address parser.
const ADDRESS =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

/** True for one plain ASCII mailbox such as `jane.doe+jobs@example.com`. */
export function isPlainEmailAddress(value: string): boolean {
  if (value.length > MAX_ADDRESS_LENGTH) {
    return false;
  }

  const at = value.lastIndexOf("@");

  return at > 0 && at <= MAX_LOCAL_LENGTH && ADDRESS.test(value);
}
