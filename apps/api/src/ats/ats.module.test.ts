import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { OpenRouterModule } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { AtsImpactService } from "./ats-impact.service";
import { AtsPurgeService } from "./ats-purge.service";
import { AtsScanService } from "./ats-scan.service";
import { AtsUnlockService } from "./ats-unlock.service";
import { AtsReportsController } from "./ats-reports.controller";
import { AtsReportsService } from "./ats-reports.service";
import { AtsModule } from "./ats.module";
import { PgAtsScanStore } from "./ats.pg-store";
import { ATS_SCAN_STORE } from "./ats.types";

type Provider = {
  provide?: symbol | object;
  useFactory?: (...args: never[]) => unknown;
};

function providerFor(token: symbol | object) {
  const providers = (Reflect.getMetadata("providers", AtsModule) ??
    []) as Provider[];

  return providers.find((provider) => provider.provide === token);
}

describe("AtsModule", () => {
  it("imports the OpenRouter module the impact service needs", () => {
    const imports = Reflect.getMetadata("imports", AtsModule) as unknown[];

    expect(imports).toContain(OpenRouterModule);
  });

  it("builds the Postgres store from the database", () => {
    const store = providerFor(ATS_SCAN_STORE)?.useFactory?.({} as never);

    expect(store).toBeInstanceOf(PgAtsScanStore);
  });

  it("builds the impact service from the OpenRouter client", () => {
    const service = providerFor(AtsImpactService)?.useFactory?.({} as never);

    expect(service).toBeInstanceOf(AtsImpactService);
  });

  it("builds the scan service with its store and the impact service", () => {
    const service = providerFor(AtsScanService)?.useFactory?.(
      {} as never,
      {} as never,
    );

    expect(service).toBeInstanceOf(AtsScanService);
  });

  it("builds the unlock service with the store and the lead capture", () => {
    const service = providerFor(AtsUnlockService)?.useFactory?.(
      {} as never,
      {} as never,
    );

    expect(service).toBeInstanceOf(AtsUnlockService);
  });

  it("builds the in-app reports from the store", () => {
    expect(
      providerFor(AtsReportsService)?.useFactory?.({} as never),
    ).toBeInstanceOf(AtsReportsService);
  });

  it("exposes the signed-in reports next to the public scan", () => {
    expect(Reflect.getMetadata("controllers", AtsModule)).toContain(
      AtsReportsController,
    );
  });

  it("builds the retention purge from the store", () => {
    const service = providerFor(AtsPurgeService)?.useFactory?.({} as never);

    expect(service).toBeInstanceOf(AtsPurgeService);
  });

  /** Unlocking sends a magic link through the existing auth service. */
  it("imports the auth module the unlock service needs", () => {
    const imports = Reflect.getMetadata("imports", AtsModule) as unknown[];

    expect(imports).toContain(AuthModule);
  });

  it("exports the store and the scan service", () => {
    const exported = Reflect.getMetadata("exports", AtsModule) as unknown[];

    expect(exported).toContain(ATS_SCAN_STORE);
    expect(exported).toContain(AtsScanService);
  });
});
