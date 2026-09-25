import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AcquisitionEventsService } from "./acquisition-events.service";
import { AcquisitionPurgeService } from "./acquisition-purge.service";
import { PublicAcquisitionEventsController } from "./acquisition.controller";
import { AcquisitionModule } from "./acquisition.module";
import { PgAcquisitionEventStore } from "./acquisition.pg-store";
import { ACQUISITION_EVENT_STORE } from "./acquisition.types";
import { PgToolQueryStore } from "./tool-queries.pg-store";
import { ToolQueriesService } from "./tool-queries.service";
import { TOOL_QUERY_STORE } from "./tool-queries.types";

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

  it("builds the search counter's store and exports its service", () => {
    expect(
      providerFor(TOOL_QUERY_STORE)?.useFactory?.({} as never),
    ).toBeInstanceOf(PgToolQueryStore);
    expect(Reflect.getMetadata("exports", AcquisitionModule)).toEqual([
      ToolQueriesService,
    ]);
  });

  it.each([
    ["events", AcquisitionEventsService],
    ["purge", AcquisitionPurgeService],
    ["search counter", ToolQueriesService],
  ])("builds the %s service from the store", (_label, token) => {
    expect(providerFor(token)?.useFactory?.({} as never)).toBeInstanceOf(token);
  });
});
