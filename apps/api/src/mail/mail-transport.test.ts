import { describe, expect, it } from "vitest";
import { toMailMessage } from "./mail-transport";

const sender = { from: "Jobspark <no-reply@jobspark.test>", replyTo: null };
const email = {
  headers: { "List-Unsubscribe": "<https://app.jobspark.test/notifications>" },
  html: "<p>Bonjour</p>",
  subject: "3 offres pour vous aujourd'hui",
  text: "Bonjour",
};

describe("toMailMessage", () => {
  it("keeps two e-mails with the same subject out of one Gmail conversation", () => {
    const first = toMailMessage(sender, "ada@jobspark.test", email);
    const second = toMailMessage(sender, "ada@jobspark.test", email);

    expect(first.headers?.["X-Entity-Ref-ID"]).toBeTruthy();
    expect(first.headers?.["X-Entity-Ref-ID"]).not.toBe(second.headers?.["X-Entity-Ref-ID"]);
  });

  it("keeps the headers the e-mail brought", () => {
    expect(toMailMessage(sender, "ada@jobspark.test", email).headers).toMatchObject(
      email.headers,
    );
  });
});
