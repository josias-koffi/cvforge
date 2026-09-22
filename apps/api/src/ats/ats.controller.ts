import {
  Body,
  Controller,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { clientIp } from "../shared/rate-limit/rate-limit.middleware";
import { AtsScanService } from "./ats-scan.service";
import { AtsUnlockService, type AtsUnlockResponse } from "./ats-unlock.service";
import type { PublicAtsScanResponse } from "./ats.types";
import { MAX_SCAN_BYTES, readOfferText } from "./ats.validation";
import type { CvSourceFile } from "../cv-generation/cv-text-extraction";

const uuid = new ParseUUIDPipe({ version: "4" });

type ScanRequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

/**
 * The free ATS scan — the only unauthenticated route in the product that spends
 * CPU and model credits.
 *
 * Protected upstream by `RateLimitMiddleware` (per IP and a global daily
 * budget), and by the budget check inside the service. No session is read: the
 * whole point is that a visitor can try the product before signing up.
 */
@Controller("public/ats-scan")
export class PublicAtsScanController {
  constructor(
    @Inject(AtsScanService) private readonly scanService: AtsScanService,
    @Inject(AtsUnlockService) private readonly unlockService: AtsUnlockService,
  ) {}

  @Post()
  @UseInterceptors(
    // Multer's own cap, so an oversized upload is refused before it is fully
    // buffered; the service validates the size again from the bytes it got.
    FileInterceptor("cvFile", { limits: { fileSize: MAX_SCAN_BYTES } }),
  )
  scan(
    @UploadedFile() file: CvSourceFile | undefined,
    @Body() body: { locale?: string; offerText?: unknown },
    @Req() request: ScanRequestLike,
  ): Promise<PublicAtsScanResponse> {
    return this.scanService.scanPublic({
      file,
      ip: clientIp(request),
      locale: body?.locale === "en" ? "en" : "fr",
      offerText: readOfferText(body?.offerText),
    });
  }

  /**
   * Trades the email for the full report, returned in this response rather
   * than by mail. The magic link goes out alongside and does the acquisition.
   */
  @Post(":scanId/unlock")
  unlock(
    @Param("scanId", uuid) scanId: string,
    @Body() body: { consentAccepted?: unknown; email?: unknown },
  ): Promise<AtsUnlockResponse> {
    return this.unlockService.unlock({
      consentAccepted: body?.consentAccepted === true,
      email: typeof body?.email === "string" ? body.email : "",
      scanId,
    });
  }
}
