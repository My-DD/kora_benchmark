#!/usr/bin/env npx tsx
/**
 * Converts scenarios.json from JSON array format to JSONL format, restructuring each
 * scenario to match the Scenario type produced by the expand command — moving
 * riskCategoryId, riskId, ageRange into the seed, adding motivation from the
 * scenarioSeeds JSONL file, and removing extra top-level fields.
 */
import {createReadStream} from "node:fs";
import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import * as readline from "node:readline";

const dataDir = path.join(import.meta.dirname, "../data");

interface Motivation {
  name: string;
  description: string;
}

async function loadSeedMotivations(
  seedsJsonlPath: string
): Promise<Map<string, Motivation>> {
  const motivations = new Map<string, Motivation>();
  const rl = readline.createInterface({
    input: createReadStream(seedsJsonlPath),
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const seed = JSON.parse(trimmed) as {id: string; motivation: Motivation};
    motivations.set(seed.id, seed.motivation);
  }
  return motivations;
}

const scenarioTopLevelKeys = new Set([
  "shortTitle",
  "childMaturity",
  "childBackground",
  "narrative",
  "evaluationCriteria",
  "modelMemory",
  "seed",
  "firstUserMessage",
]);

async function convertScenarios() {
  const inputPath = path.join(dataDir, "scenarios.json");
  const seedsPath = path.join(dataDir, "scenarioSeeds.jsonl");
  const outputPath = path.join(dataDir, "scenarios.jsonl");

  console.log("Converting scenarios.json to JSONL...");

  const [content, seedMotivations] = await Promise.all([
    readFile(inputPath, "utf-8"),
    loadSeedMotivations(seedsPath),
  ]);

  const rawScenarios: Array<Record<string, unknown>> = JSON.parse(content);

  const scenarios = rawScenarios.map(raw => {
    const seed = raw["seed"] as Record<string, unknown>;
    const seedId = seed["id"] as string;

    const motivation = seedMotivations.get(seedId);
    if (!motivation) {
      throw new Error(`No motivation found for seed ${seedId}`);
    }

    // Build the full seed with fields moved from the top level.
    const fullSeed = {
      ...seed,
      riskCategoryId: raw["riskCategoryId"],
      riskId: raw["riskId"],
      ageRange: raw["ageRange"],
      motivation,
    };

    // Build the scenario with only the fields that belong on the Scenario type.
    const scenario: Record<string, unknown> = {};
    for (const key of Object.keys(raw)) {
      if (scenarioTopLevelKeys.has(key)) {
        scenario[key] = key === "seed" ? fullSeed : raw[key];
      }
    }

    return scenario;
  });

  const jsonlContent =
    scenarios.map(scenario => JSON.stringify(scenario)).join("\n") + "\n";
  await writeFile(outputPath, jsonlContent);

  console.log(`  Converted ${scenarios.length} scenarios to ${outputPath}`);
}

async function main() {
  await convertScenarios();
  console.log(
    "\nDone! You can now delete the original .json files if desired."
  );
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
