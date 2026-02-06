import {Hash, Script} from "@korabench/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline";
import {flatTransform, pipeline, reduce} from "streaming-iterables";
import {v4 as uuid} from "uuid";
import * as v from "valibot";
import {TestContext} from "../benchmark.js";
import {Program} from "../cli.js";
import {kora} from "../kora.js";
import {Scenario} from "../model/scenario.js";
import {ScenarioKey} from "../model/scenarioKey.js";
import {TestResult} from "../model/testResult.js";
import {
  ageRangeToAge,
  getChatEndpointResponse,
  restoreChatEndpointMemory,
} from "./chatEndpoint.js";
import {getStructuredResponse, getTextResponse} from "./model.js";

interface TestTask {
  scenario: Scenario;
  key: string;
}

type TaskOutcome =
  | {kind: "success"; testResult: TestResult}
  | {kind: "failure"};

type RunResult = v.InferOutput<typeof kora.runResultType>;

interface RunState {
  failureCount: number;
  testCount: number;
  runResult: RunResult | undefined;
}

function isUrlTarget(targetModelSlug: string): boolean {
  return (
    targetModelSlug.startsWith("http://") ||
    targetModelSlug.startsWith("https://")
  );
}

function taskTempFileName(key: string): string {
  return Hash.shortHash(key) + ".json";
}

async function* readScenariosFromJsonl(
  filePath: string
): AsyncGenerator<Scenario> {
  const fh = await fs.open(filePath);
  const rl = readline.createInterface({input: fh.createReadStream()});
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    yield v.parse(Scenario.io, JSON.parse(trimmed));
  }
}

async function* scenariosToTestTasks(
  filePath: string,
  skipDefault: boolean
): AsyncGenerator<TestTask> {
  for await (const scenario of readScenariosFromJsonl(filePath)) {
    for (const key of kora.mapScenarioToKeys(scenario)) {
      if (skipDefault && key.endsWith(":default")) {
        continue;
      }
      yield {scenario, key};
    }
  }
}

async function countTestTasks(
  filePath: string,
  skipDefault: boolean
): Promise<number> {
  let count = 0;
  for await (const scenario of readScenariosFromJsonl(filePath)) {
    const keys = kora.mapScenarioToKeys(scenario);
    count += skipDefault
      ? keys.filter(k => !k.endsWith(":default")).length
      : keys.length;
  }
  return count;
}

async function hasTempFiles(tempDir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(tempDir);
    return files.length > 0;
  } catch {
    return false;
  }
}

function createStandardContext(
  judgeModelSlug: string,
  userModelSlug: string,
  targetModelSlug: string
): TestContext {
  return {
    getUserResponse: async request => ({
      output: await getTextResponse(userModelSlug, request.messages, {
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      }),
    }),
    getAssistantResponse: async request => ({
      output: await getTextResponse(targetModelSlug, request.messages, {
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      }),
    }),
    getJudgeResponse: async request => ({
      output: await getStructuredResponse(
        judgeModelSlug,
        request.messages,
        request.outputType,
        {maxTokens: request.maxTokens}
      ),
    }),
  };
}

async function createChatEndpointContext(
  judgeModelSlug: string,
  userModelSlug: string,
  targetBaseUrl: string,
  taskKey: string,
  scenario: Scenario
): Promise<TestContext> {
  const sessionId = `${uuid()}_${uuid()}`;
  const key = ScenarioKey.ofString(taskKey);
  const age = ageRangeToAge(key.ageRange);

  if (scenario.modelMemory) {
    await restoreChatEndpointMemory(
      targetBaseUrl,
      sessionId,
      age,
      scenario.modelMemory
    );
  }

  return {
    getUserResponse: async request => ({
      output: await getTextResponse(userModelSlug, request.messages, {
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      }),
    }),
    getAssistantResponse: async request => {
      const lastUserMessage = [...request.messages]
        .reverse()
        .find(m => m.role === "user");
      if (!lastUserMessage) {
        throw new Error("No user message found in request messages");
      }

      const output = await getChatEndpointResponse(
        targetBaseUrl,
        sessionId,
        age,
        lastUserMessage.content
      );
      return {output};
    },
    getJudgeResponse: async request => ({
      output: await getStructuredResponse(
        judgeModelSlug,
        request.messages,
        request.outputType,
        {maxTokens: request.maxTokens}
      ),
    }),
  };
}

export async function runCommand(
  _program: Program,
  judgeModelSlug: string,
  userModelSlug: string,
  targetModelSlug: string,
  scenariosFilePath: string,
  outputFilePath: string
) {
  const isUrl = isUrlTarget(targetModelSlug);
  const standardContext = isUrl
    ? undefined
    : createStandardContext(judgeModelSlug, userModelSlug, targetModelSlug);

  const outputDir = path.dirname(outputFilePath);
  const tempDir = path.join(outputDir, ".kora-run-tmp");

  // Clear output file if no process in progress (no temp files)
  if (!(await hasTempFiles(tempDir))) {
    await fs.mkdir(outputDir, {recursive: true});
    await fs.writeFile(outputFilePath, "");
  }

  await fs.mkdir(tempDir, {recursive: true});

  const totalTests = await countTestTasks(scenariosFilePath, isUrl);
  const progress = Script.progress(totalTests, text =>
    process.stdout.write(text)
  );

  const {failureCount, testCount, runResult} = await pipeline(
    () => scenariosToTestTasks(scenariosFilePath, isUrl),
    flatTransform(10, async (task: TestTask): Promise<TaskOutcome[]> => {
      const tempFile = path.join(tempDir, taskTempFileName(task.key));

      // Check if already processed (graceful restart).
      try {
        const content = await fs.readFile(tempFile, "utf-8");
        progress.increment(true);
        const testResult = v.parse(kora.testResultType, JSON.parse(content));
        return [{kind: "success", testResult}];
      } catch {
        // Not yet processed.
      }

      try {
        const context = isUrl
          ? await createChatEndpointContext(
              judgeModelSlug,
              userModelSlug,
              targetModelSlug,
              task.key,
              task.scenario
            )
          : standardContext!;

        const testResult = await kora.runTest(context, task.scenario, task.key);
        await fs.writeFile(tempFile, JSON.stringify(testResult));
        progress.increment(true);
        return [{kind: "success", testResult}];
      } catch (error) {
        console.error(`\nTest failed for key ${task.key}: ${error}`);
        progress.increment(false);
        return [{kind: "failure"}];
      }
    }),
    reduce(
      (state: RunState, outcome: TaskOutcome): RunState => {
        if (outcome.kind === "failure") {
          return {...state, failureCount: state.failureCount + 1};
        }

        const mapped = kora.mapTestResultToRunResult(outcome.testResult);
        return {
          failureCount: state.failureCount,
          testCount: state.testCount + 1,
          runResult: state.runResult
            ? kora.reduceRunResult(state.runResult, mapped)
            : mapped,
        };
      },
      {failureCount: 0, testCount: 0, runResult: undefined} as RunState
    )
  );

  progress.finish();

  if (failureCount > 0) {
    console.log(
      `\n${failureCount} tests failed. Temp files kept at ${tempDir} for restart.`
    );
    console.log(`Re-run the command to retry failed tests.`);
    return;
  }

  // Write reduced result.
  await fs.mkdir(outputDir, {recursive: true});
  await fs.writeFile(
    outputFilePath,
    runResult ? JSON.stringify(runResult) + "\n" : ""
  );

  await fs.rm(tempDir, {recursive: true, force: true});

  console.log(`\nCompleted ${testCount} tests → ${outputFilePath}`);
}
