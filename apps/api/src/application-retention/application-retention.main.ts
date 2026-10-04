import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadEnvironmentFiles } from "../shared/env";
import {
  ApplicationRetentionService,
  PRIVACY_POLICY_SENTENCE,
} from "./application-retention.service";

/**
 * Warns about the applications untouched for a year and deletes those warned
 * 15 days ago (US-170), once, now.
 *
 *   pnpm --filter @cvforge/api applications:purge -- --dry-run   (counts only)
 *   pnpm --filter @cvforge/api applications:purge                (does it)
 *   node apps/api/dist/apps/api/src/application-retention/application-retention.main.js [--dry-run]
 *
 * The first real pass turns the daily one on. It refuses to run until the
 * published privacy policy announces the rule.
 */
async function main() {
  loadEnvironmentFiles();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const retention = app.get(ApplicationRetentionService);

    if (process.argv.slice(2).includes("--dry-run")) {
      console.log(JSON.stringify(await retention.preview(), null, 2));
      return;
    }

    if (!(await retention.policyPublished())) {
      console.error(
        `La politique de confidentialité publiée ne contient pas « ${PRIVACY_POLICY_SENTENCE} ».` +
          " Publiez-la depuis /admin/legal avant la première suppression.",
      );
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(await retention.run(), null, 2));
  } finally {
    await app.close();
  }
}

void main();
