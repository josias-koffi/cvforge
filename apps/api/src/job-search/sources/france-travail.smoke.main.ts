import { resolveFranceTravailConfig } from "./france-travail.config";
import { FranceTravailSource } from "./france-travail.source";

/**
 * Calls the real France Travail API once, to check the credentials, the codes
 * and the mapping against live data. Everything else about this source is unit
 * tested on fixtures; what fixtures cannot prove is that the reference codes
 * are the right ones (sprint 025, "To Clarify").
 *
 *   pnpm --filter @cvforge/api ft:smoke -- "développeur" 44
 *
 * Reads nothing, writes nothing: one search and one detail lookup.
 */
async function main() {
  const [keywords = "développeur", department = ""] = process.argv.slice(2);
  const config = resolveFranceTravailConfig();

  if (!config.enabled) {
    console.error(
      "FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET sont requis.",
    );
    process.exitCode = 1;
    return;
  }

  const source = new FranceTravailSource(config);
  const listings = await source.search({
    contractTypes: [],
    department,
    experienceLevel: null,
    keywords,
    nafDivisions: [],
    publishedSinceDays: 7,
  });

  console.log(
    `${listings.length} offre(s) pour « ${keywords} »${department ? ` (${department})` : ""}`,
  );

  for (const listing of listings.slice(0, 5)) {
    console.log(
      [
        `- ${listing.title}`,
        `  entreprise : ${listing.companyName || "(anonyme)"}`,
        `  lieu : ${listing.locationLabel} [${listing.department || "?"}]`,
        `  contrat : ${listing.contractType}`,
        `  publiée : ${listing.publishedAt ?? "?"}`,
        `  liens partenaires : ${listing.partnerUrls.join(", ") || "aucun"}`,
      ].join("\n"),
    );
  }

  const first = listings[0];
  if (first) {
    console.log(
      `Vérification en direct de ${first.externalId} : ${await source.isStillOpen(first.externalId)}`,
    );
  }

  // Anything mapped as "unknown" means a reference code we do not handle yet.
  const unknown = listings.filter((listing) => listing.contractType === "unknown");
  if (unknown.length > 0) {
    console.warn(
      `⚠️ ${unknown.length} offre(s) au contrat non reconnu : ${[
        ...new Set(
          unknown.map(
            (listing) =>
              (listing.raw as { typeContrat?: string }).typeContrat ?? "?",
          ),
        ),
      ].join(", ")}`,
    );
  }
}

void main();
