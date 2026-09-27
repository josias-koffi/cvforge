import { Body, Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import { clientIp } from "../shared/rate-limit/rate-limit.middleware";
import { AcquisitionEventsService } from "./acquisition-events.service";

type EventRequestLike = Parameters<typeof clientIp>[0];

/**
 * The landing's funnel events. Public like the scan itself, but it spends
 * nothing: a closed-list row, at most once per visitor, step and day.
 */
@Controller("public/events")
export class PublicAcquisitionEventsController {
  constructor(
    @Inject(AcquisitionEventsService)
    private readonly eventsService: AcquisitionEventsService,
  ) {}

  @Post()
  @HttpCode(204)
  async record(
    @Body() body: { locale?: unknown; step?: unknown; tool?: unknown },
    @Req() request: EventRequestLike,
  ): Promise<void> {
    await this.eventsService.record({
      ip: clientIp(request),
      locale: body?.locale,
      step: body?.step,
      tool: body?.tool,
    });
  }
}
