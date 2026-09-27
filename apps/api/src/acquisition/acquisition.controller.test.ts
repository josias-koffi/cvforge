import { describe, expect, it, vi } from "vitest";
import type { AcquisitionEventsService } from "./acquisition-events.service";
import { PublicAcquisitionEventsController } from "./acquisition.controller";

describe("PublicAcquisitionEventsController", () => {
  it("records the event with the visitor's forwarded address", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const controller = new PublicAcquisitionEventsController({
      record,
    } as unknown as AcquisitionEventsService);

    await controller.record(
      { locale: "en", step: "result", tool: "ats" },
      { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } },
    );

    expect(record).toHaveBeenCalledWith({
      ip: "203.0.113.7",
      locale: "en",
      step: "result",
      tool: "ats",
    });
  });
});
