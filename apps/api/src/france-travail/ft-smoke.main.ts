import { loadEnvironmentFiles } from "../shared/env";
import { FT_API_IDS, isFtApiId, type FtApiId } from "./ft.config";
import { smokeFtApi } from "./ft-smoke";

/**
 * Checks France Travail APIs against the live platform, one token and one read
 * call each. Reads nothing from the database, writes nothing.
 *
 *   pnpm --filter @cvforge/api ft:smoke romeo
 *   pnpm --filter @cvforge/api ft:smoke all
 *   node apps/api/dist/apps/api/src/france-travail/ft-smoke.main.js romeo   (container)
 *
 * An `invalid_scope` means the API is not subscribed on francetravail.io, or
 * its scope is not the one in `FT_APIS` (override: FRANCE_TRAVAIL_<ID>_SCOPE).
 * The detailed Offres d'emploi check, with its filters, is `ft:smoke:offres`.
 */
async function main() {
  loadEnvironmentFiles();

  // `pnpm run` forwards a `--` separator as a real argument.
  const [target = ""] = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  const ids: FtApiId[] =
    target === "all" ? FT_API_IDS : isFtApiId(target) ? [target] : [];

  if (ids.length === 0) {
    console.error(`Usage : ft:smoke <${FT_API_IDS.join("|")}|all>`);
    process.exitCode = 1;
    return;
  }

  for (const id of ids) {
    const lines = await smokeFtApi(id, process.env);
    console.log(lines.join("\n"));
    if (lines.some((line) => line.includes("❌") || line.includes("⚠️")))
      process.exitCode = 1;
  }
}

void main();
