import {isDefined, Script} from "@korabench/core";
import {toJsonSchema} from "@valibot/to-json-schema";
import JsonParser from "jsonc-parser";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import OpenAI from "openai";
import PQueue from "p-queue";
import * as R from "remeda";
import * as v from "valibot";
import {Motivation} from "../src/model/motivation.js";
import {Risk} from "../src/model/risk.js";
import {RiskCategory} from "../src/model/riskCategory.js";
import {
  ModelScenario,
  ModelScenarioLight,
  ModelScenarioWithMemory,
  Scenario,
} from "../src/model/scenario.js";
import {ScenarioSeed} from "../src/model/scenarioSeed.js";
import {ScenarioSeedSlice} from "../src/model/scenarioSeedSlice.js";
import {ScenarioValidation} from "../src/model/scenarioValidation.js";
import {scenarioToValidationPrompt} from "../src/prompts/scenarioToValidationPrompt.js";
import {seedToScenarioPrompt} from "../src/prompts/seedToScenarioPrompt.js";
import {withRateLimitRetry} from "./rateLimitRetry.js";

//
// Load scenario seeds.
//

const dataPath = path.resolve(import.meta.dirname, "..", "..", "src", "data");
const seedsFilePath = path.join(dataPath, "scenarioSeeds.json");

const seedsFileContent = await fs.readFile(seedsFilePath, "utf-8");
const seedSlices = v.parse(
  v.array(ScenarioSeedSlice.io),
  JSON.parse(seedsFileContent)
);

console.log(`Loaded ${seedSlices.length} seed slices.`);

//
// Caching.
//

const scenariosCacheDir = path.join(dataPath, "scenarios");

await fs.mkdir(scenariosCacheDir, {recursive: true});

function getScenarioCachePath(seedId: string): string {
  return path.join(scenariosCacheDir, `${seedId}.json`);
}

async function loadCachedScenario(
  seedId: string
): Promise<Scenario | undefined> {
  const cachePath = getScenarioCachePath(seedId);
  try {
    const content = await fs.readFile(cachePath, "utf-8");
    return v.parse(Scenario.io, JSON.parse(content));
  } catch {
    return undefined;
  }
}

async function saveCachedScenario(scenario: Scenario): Promise<void> {
  const cachePath = getScenarioCachePath(scenario.id);
  await fs.writeFile(cachePath, JSON.stringify(scenario, undefined, 2));
}

//
// Setup.
//

const client = new OpenAI();
const queue = new PQueue({concurrency: 10});

//
// Process a single seed into a scenario.
//

const validationSchema = toJsonSchema(ScenarioValidation.io);

interface Task {
  slice: ScenarioSeedSlice;
  riskCategory: RiskCategory;
  risk: Risk;
  motivation: Motivation;
  seed: ScenarioSeed;
}

interface ValidationFeedback {
  previousAttempt: ModelScenario;
  reasons: string;
}

async function expandSeed(
  task: Task,
  validationFeedback?: ValidationFeedback
): Promise<ModelScenario> {
  const {riskCategory, risk, motivation, seed} = task;
  const VScenario = risk.provideUserContext
    ? ModelScenarioWithMemory.io
    : ModelScenarioLight.io;
  const scenarioSchema = toJsonSchema(VScenario);
  const prompt = seedToScenarioPrompt(
    riskCategory,
    risk,
    motivation,
    seed,
    validationFeedback
  );

  const response = await withRateLimitRetry(() =>
    client.responses.create({
      model: "gpt-5.2-2025-12-11",
      temperature: 0.3,
      input: [
        {role: "system", content: prompt.system},
        {role: "user", content: prompt.user},
      ],
      text: {
        format: {
          type: "json_schema",
          strict: true,
          schema: scenarioSchema as any,
          name: "output_schema",
        },
      },
    })
  );

  return v.parse(VScenario, JsonParser.parse(response.output_text));
}

async function validateScenario(
  riskCategory: RiskCategory,
  risk: Risk,
  scenario: Scenario
): Promise<ScenarioValidation> {
  const prompt = scenarioToValidationPrompt(
    riskCategory,
    risk,
    scenario.ageRange,
    scenario
  );

  const response = await withRateLimitRetry(() =>
    client.responses.create({
      model: "gpt-5.2-2025-12-11",
      temperature: 0.3,
      input: [
        {role: "system", content: prompt.system},
        {role: "user", content: prompt.user},
      ],
      text: {
        format: {
          type: "json_schema",
          strict: true,
          schema: validationSchema as any,
          name: "output_schema",
        },
      },
    })
  );

  return v.parse(ScenarioValidation.io, JsonParser.parse(response.output_text));
}

const maxAttempts = 2;

async function processSeed(task: Task): Promise<Scenario | undefined> {
  const {slice, riskCategory, risk, seed} = task;

  // Check cache first.
  const cached = await loadCachedScenario(seed.id);
  if (cached) {
    return cached;
  }

  let validationFeedback: ValidationFeedback | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const modelScenario = await expandSeed(task, validationFeedback);

    const scenario: Scenario = {
      id: seed.id,
      riskCategoryId: slice.riskCategoryId,
      riskId: slice.riskId,
      ageRange: slice.ageRange,
      seed,
      firstUserMessage: "", // TODO.
      ...modelScenario,
    };

    const validation = await validateScenario(riskCategory, risk, scenario);
    if (validation.verdict === "pass") {
      await saveCachedScenario(scenario);
      return scenario;
    }

    console.log("Validation failed with:", validation.reasons);

    validationFeedback = {
      previousAttempt: modelScenario,
      reasons: validation.reasons,
    };
  }

  return undefined;
}

//
// Build tasks from seed slices.
//

const tasks = seedSlices.flatMap(slice => {
  const riskCategory = RiskCategory.listAll().find(
    rc => rc.id === slice.riskCategoryId
  );
  if (!riskCategory) {
    throw new Error(`Risk category not found: ${slice.riskCategoryId}`);
  }

  const risk = riskCategory.risks.find(r => r.id === slice.riskId);
  if (!risk) {
    throw new Error(`Risk not found: ${slice.riskId}`);
  }

  const motivations = Motivation.listAll();
  const motivation = motivations.find(m => m.name === slice.motivation.name);
  if (!motivation) {
    throw new Error(`Motivation not found: ${slice.motivation.name}`);
  }

  return R.pipe(
    slice.seeds,
    R.take(1),
    R.map(
      (s): Task => ({
        slice,
        riskCategory,
        risk,
        motivation,
        seed: s,
      })
    )
  );
});

//
// Execute tasks with concurrency limit.
//

const progress = Script.progress(tasks.length, s => process.stdout.write(s));
progress.render();

const results = await Promise.all(
  tasks.map(t =>
    queue.add(async () => {
      const result = await processSeed(t);
      progress.increment(isDefined(result));
      return result;
    })
  )
);

progress.finish();

//
// Write scenarios file.
//

const scenarios = results.filter(isDefined);
const scenariosFilePath = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "src",
  "data",
  "scenarios.json"
);

await fs.writeFile(scenariosFilePath, JSON.stringify(scenarios, undefined, 2));

console.log(`\nWrote ${scenarios.length} scenarios to ${scenariosFilePath}`);
