import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AcquisitionEventsService } from "./acquisition-events.service";
import { AcquisitionPurgeService } from "./acquisition-purge.service";
import { PublicAcquisitionEventsController } from "./acquisition.controller";
import { AcquisitionModule } from "./acquisition.module";
import { PgAcquisitionEventStore } from "./acquisition.pg-store";
import { ACQUISITION_EVENT_STORE } from "./acquisition.types";

type Provider = {
  provide?: symbol | object;
  useFactory?: (...args: never[]) => unknown;
};

function providerFor(token: symbol | object) {
  const providers = (Reflect.getMetadata("providers", AcquisitionModule) ??
    []) as Provider[];

  return providers.find((provider) => provider.provide === token);
}

describe("AcquisitionModule", () => {
  it("exposes the public events route", () => {
    expect(Reflect.getMetadata("controllers", AcquisitionModule)).toEqual([
      PublicAcquisitionEventsController,
    ]);
  });

  it("builds the Postgres store from the database", () => {
    expect(
      providerFor(ACQUISITION_EVENT_STORE)?.useFactory?.({} as never),
    ).toBeInstanceOf(PgAcquisitionEventStore);
  });

  it.each([
    ["events", AcquisitionEventsService],
    ["purge", AcquisitionPurgeService],
  ])("builds the %s service from the store", (_label, token) => {
    expect(providerFor(token)?.useFactory?.({} as never)).toBeInstanceOf(token);
  });
});
