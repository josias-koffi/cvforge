import { BadRequestException, Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RomeAppellationsReader } from "../rome/rome-appellations.pg-reader";
import type { RomeoClient, RomeoPrediction } from "../rome/romeo.client";
import type { SearchProjectRomeStore } from "./search-project-rome.pg-store";
import { SearchProjectRomeService } from "./search-project-rome.service";

const BAKER = {
  code: "11573",
  libelle: "Boulanger / Boulangère",
  metierCode: "D1102",
  metierLibelle: "Boulanger / Boulangère",
};

function prediction(code: string, score: number): RomeoPrediction {
  return { ...BAKER, code, score, textIndex: 0 };
}

function createService(options: {
  predictions?: RomeoPrediction[] | null;
  decided?: string[];
  known?: typeof BAKER | null;
  suggested?: typeof BAKER | null;
}) {
  const store = {
    confirm: vi.fn(async () => undefined),
    decidedCodes: vi.fn(async () => new Set(options.decided ?? [])),
    dismiss: vi.fn(async () => true),
    findOne: vi.fn(async () =>
      options.suggested
        ? { ...options.suggested, score: 0.8, status: "suggested" as const }
        : null,
    ),
    list: vi.fn(async () => []),
    replaceSuggestions: vi.fn(async () => undefined),
  };
  const romeo = {
    predict: vi.fn(async () =>
      options.predictions === undefined ? [] : options.predictions,
    ),
  };
  const appellations = {
    find: vi.fn(async () => options.known ?? null),
    search: vi.fn(),
  };

  return {
    appellations,
    romeo,
    service: new SearchProjectRomeService(
      store as unknown as SearchProjectRomeStore,
      romeo as unknown as RomeoClient,
      appellations as unknown as RomeAppellationsReader,
    ),
    store,
  };
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("SearchProjectRomeService.suggest", () => {
  it("keeps the five best undecided appellations", async () => {
    const { romeo, service, store } = createService({
      decided: ["A"],
      predictions: ["A", "B", "C", "D", "E", "F", "G"].map((code, index) =>
        prediction(code, 1 - index / 10),
      ),
    });

    await service.suggest("ana@x.fr", "p1", ["Boulanger", "Pâtissier"]);

    expect(romeo.predict).toHaveBeenCalledWith(["Boulanger", "Pâtissier"]);
    expect(
      (
        store.replaceSuggestions.mock.calls[0] as unknown as [
          string,
          string,
          RomeoPrediction[],
        ]
      )[2].map((entry) => entry.code),
    ).toEqual(["B", "C", "D", "E", "F"]);
  });

  it("leaves the previous suggestions alone when ROMEO cannot answer", async () => {
    const { service, store } = createService({ predictions: null });

    await service.suggest("ana@x.fr", "p1", ["Boulanger"]);

    expect(store.replaceSuggestions).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("ROMEO unavailable"),
    );
  });

  it("never throws: the project is already saved", async () => {
    const { romeo, service, store } = createService({});
    romeo.predict.mockRejectedValueOnce(new Error("socket hang up"));

    await expect(
      service.suggest("ana@x.fr", "p1", ["Boulanger"]),
    ).resolves.toBeUndefined();
    expect(store.replaceSuggestions).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("socket hang up"),
    );
  });
});

describe("SearchProjectRomeService decisions", () => {
  it("confirms a suggestion with what ROMEO said about it", async () => {
    const { appellations, service, store } = createService({
      suggested: BAKER,
    });

    await service.confirm("ana@x.fr", "p1", BAKER.code);

    expect(store.confirm).toHaveBeenCalledWith(
      "ana@x.fr",
      "p1",
      expect.objectContaining({ code: BAKER.code }),
    );
    expect(appellations.find).not.toHaveBeenCalled();
    expect(store.list).toHaveBeenCalledWith("ana@x.fr", "p1");
  });

  it("confirms a code picked from the referential", async () => {
    const { service, store } = createService({ known: BAKER });

    await service.confirm("ana@x.fr", "p1", BAKER.code);

    expect(store.confirm).toHaveBeenCalledWith("ana@x.fr", "p1", BAKER);
  });

  it("refuses a code the referential does not know", async () => {
    const { service, store } = createService({ known: null });

    await expect(
      service.confirm("ana@x.fr", "p1", "made-up"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(store.confirm).not.toHaveBeenCalled();
  });

  it("dismisses, then answers the new list", async () => {
    const { service, store } = createService({});

    await service.dismiss("ana@x.fr", "p1", BAKER.code);

    expect(store.dismiss).toHaveBeenCalledWith("ana@x.fr", "p1", BAKER.code);
    expect(store.list).toHaveBeenCalled();
  });

  it("lists through the store", async () => {
    const { service, store } = createService({});

    await service.list("ana@x.fr", "p1");

    expect(store.list).toHaveBeenCalledWith("ana@x.fr", "p1");
  });
});
