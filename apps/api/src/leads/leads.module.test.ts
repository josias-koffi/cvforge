import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { LeadCaptureService } from "./lead-capture.service";
import { LeadsModule } from "./leads.module";

type Provider = {
  provide?: unknown;
  useFactory?: (...args: never[]) => unknown;
};

describe("LeadsModule", () => {
  it("builds the lead capture from the auth collaborators, and exports it", () => {
    const providers = Reflect.getMetadata(
      "providers",
      LeadsModule,
    ) as Provider[];
    const provider = providers.find(
      (entry) => entry.provide === LeadCaptureService,
    );

    expect(provider?.useFactory?.({} as never, {} as never)).toBeInstanceOf(
      LeadCaptureService,
    );
    expect(Reflect.getMetadata("exports", LeadsModule)).toContain(
      LeadCaptureService,
    );
  });
});
