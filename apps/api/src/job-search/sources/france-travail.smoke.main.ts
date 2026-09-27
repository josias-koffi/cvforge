import type { JobSourceQuery } from "../job-search.types";
import { loadEnvironmentFiles } from "../../shared/env";
import { FtHttpClient } from "../../france-travail/ft-http.client";
import { resolveFtConfig } from "../../france-travail/ft.config";
import { FranceTravailSource } from "./france-travail.source";

/**
 * Calls the real France Travail API once, to check the credentials, the codes
 * and the mapping against live data. Everything else about this source is unit
 * tested on fixtures; what fixtures cannot prove is that the reference codes
 * are the right ones (sprint 025, "To Clarify").
 *
 *   pnpm --filter @cvforge/api ft:smoke:offres "développeur" 44
 *   node apps/api/dist/apps/api/src/job-search/sources/france-travail.smoke.main.js \
 *     "développeur" 44                           (container: it has no tsx)
 *
 * Reads nothing, writes nothing: one search and one detail lookup.
 */
async function main() {
  loadEnvironmentFiles();

  // `pnpm run` forwards a `--` separator as a real argument, so it is dropped
  // here rather than read as the keywords to search for.
  const [keywords = "développeur", department = ""] = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  // Forced on, whatever FRANCE_TRAVAIL_APIS says: this checks the API itself.
  const config = resolveFtConfig({ ...process.env, FRANCE_TRAVAIL_APIS: "offres" });

  if (!config.hasCredentials) {
    console.error(
      [
        "FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET sont requis.",
        "Créez une application sur https://francetravail.io, souscrivez à",
        "« Offres d'emploi v2 », puis reportez l'identifiant client et la clé",
        "secrète dans apps/api/.env (voir .env.example).",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const source = new FranceTravailSource(new FtHttpClient(config));
  const listings = await source.search({
    contractTypes: [],
    department,
    experienceLevel: null,
    keywords,
    romeCodes: [],
    nafDivisions: [],
    publishedSinceDays: 7,
  });

  // A wrong reference code returns an empty page rather than an error, so the
  // filtered searches are run too: a filter that silently matches nothing is
  // the failure this script exists to catch.
  await reportFilter(source, "contrat (CDI)", {
    contractTypes: ["cdi"],
    department,
    experienceLevel: null,
    keywords,
    romeCodes: [],
    nafDivisions: [],
    publishedSinceDays: 31,
  });
  await reportFilter(source, "alternance (natures E2/FS)", {
    contractTypes: ["alternance"],
    department: "",
    experienceLevel: null,
    keywords,
    romeCodes: [],
    nafDivisions: [],
    publishedSinceDays: 31,
  });
  await reportFilter(source, "secteur numérique (NAF 62/63)", {
    contractTypes: [],
    department,
    experienceLevel: null,
    keywords,
    romeCodes: [],
    nafDivisions: ["62", "63"],
    publishedSinceDays: 31,
  });
  await reportFilter(source, "métier ROME M1805, sans mots-clés", {
    contractTypes: [],
    department,
    experienceLevel: null,
    keywords: "",
    romeCodes: ["M1805"],
    nafDivisions: [],
    publishedSinceDays: 31,
  });
  await reportFilter(source, "débutant accepté", {
    contractTypes: [],
    department: "",
    experienceLevel: "debutant",
    keywords,
    romeCodes: [],
    nafDivisions: [],
    publishedSinceDays: 31,
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

/** A filtered search, reported by its count: zero means a code to check. */
async function reportFilter(
  source: FranceTravailSource,
  label: string,
  query: JobSourceQuery,
): Promise<void> {
  const found = await source.search(query);

  console.log(
    `${found.length === 0 ? "⚠️ " : "   "}${String(found.length).padStart(4)} offre(s) — filtre ${label}`,
  );
}

void main();
