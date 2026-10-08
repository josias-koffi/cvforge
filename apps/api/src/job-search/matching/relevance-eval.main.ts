import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  predictRelevance,
  type EvalExport,
  type EvalPair,
  type EvalPersona,
} from "./relevance-eval";

/**
 * Writes the deterministic score's predictions for the relevance dataset of
 * the sibling repo jobspark-relevance, which compares them with Laya's.
 *
 *   pnpm --filter @cvforge/api relevance:eval -- ../../../jobspark-relevance
 *
 * Reads <dir>/data/{export.json,personas.resolved.json,pairs.jsonl}, writes
 * <dir>/predictions/heuristic.jsonl. No database, no network.
 */
function main() {
  const root = resolve(process.argv.slice(2).find((arg) => arg !== "--") ?? "../../../jobspark-relevance");
  const read = (path: string) => readFileSync(join(root, path), "utf8");
  const data = JSON.parse(read("data/export.json")) as EvalExport;
  const personas = JSON.parse(read("data/personas.resolved.json")) as EvalPersona[];
  const pairs = read("data/pairs.jsonl")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as EvalPair);

  const predictions = predictRelevance(data, personas, pairs);
  const output = join(root, "predictions/heuristic.jsonl");

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, predictions.map((row) => JSON.stringify(row)).join("\n") + "\n");
  console.log(`${predictions.length} predictions -> ${output}`);
}

main();
