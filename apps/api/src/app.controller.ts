import { Controller, Get } from "@nestjs/common";

/** Set from the image tag at deploy time; empty when running from source. */
const VERSION = process.env.APP_VERSION?.trim() ?? "";

@Controller("health")
export class AppController {
  /**
   * Liveness, plus the build actually serving the request.
   *
   * The version is what makes a stale container visible: a smoke test that
   * only checks for a 200 passes just as happily against the previous image,
   * which is how staging once served an old build across five deploys all
   * reported successful.
   */
  @Get()
  health() {
    return {
      status: "ok",
      service: "api",
      version: VERSION,
    };
  }
}
