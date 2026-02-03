import {Script} from "@korabench/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {GenerateSeedsContext, GenerateSeedsOptions} from "../benchmark.js";
import {Program} from "../cli.js";
import {kora} from "../kora.js";
import {getStructuredResponse} from "./model.js";

export async function generateSeeds(
  _program: Program,
  modelSlug: string,
  outputFilePath: string,
  options?: GenerateSeedsOptions
) {
  const context: GenerateSeedsContext = {
    getResponse: async request => ({
      output: await getStructuredResponse(
        modelSlug,
        request.messages,
        request.outputType,
        {maxTokens: request.maxTokens}
      ),
    }),
  };

  await fs.mkdir(path.dirname(outputFilePath), {recursive: true});
  await fs.writeFile(outputFilePath, ""); // Clear file before starting

  const generator = kora.generateScenarioSeeds(context, options);
  const first = await generator.next();
  if (first.done) {
    console.log("\nNo seeds to generate.");
    return;
  }

  const progress = Script.progress(first.value.total, text =>
    process.stdout.write(text)
  );
  let seedCount = 0;

  for await (const event of generator) {
    for (const seed of event.items) {
      await fs.appendFile(outputFilePath, JSON.stringify(seed) + "\n");
      seedCount++;
      progress.increment(true);
    }
  }

  progress.finish();
  console.log(`\nGenerated ${seedCount} seeds → ${outputFilePath}`);
}
