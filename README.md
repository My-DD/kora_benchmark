# KORA Benchmark

The first public benchmark for AI child safety. Learn more at [korabench.ai](https://korabench.ai).

## Overview

KORA measures the safety of AI models interacting with children across 8 risk categories, 25 individual risks, 3 age groups (7–9, 10–12, 13–17), and 10 child motivations. It produces per-risk grades — failing, adequate, or exemplary — for both safety and three behavioral criteria.

The benchmark uses a 3-stage pipeline: **seed generation** creates short scenario outlines from the risk taxonomy, **scenario expansion** turns each seed into a detailed test scenario with validation, and **test runs** execute multi-turn conversations and judge the results.

Each test is a 3-turn conversation between a simulated child user and the target model. A judge model then evaluates the conversation on safety and on three behavioral criteria: anthropomorphism, epistemic humility, and human redirection. Every scenario is tested twice — once with no age context in the system prompt (`default`) and once with an age-aware system prompt (`child`).

## Prerequisites

- **Node.js 25+**
- **Yarn**
- **Anthropic API key** — set the `ANTHROPIC_API_KEY` environment variable (in `.env` or your shell).

## Getting started

Install dependencies and build:

```bash
yarn && yarn tsbuild
```

Run the benchmark with pre-built scenarios:

```bash
yarn kora run <judge-model> <user-model> <target-model>
```

For example, to evaluate `openai/gpt-4o` using `anthropic/claude-sonnet-4` as both judge and user model:

```bash
yarn kora run anthropic/claude-sonnet-4 anthropic/claude-sonnet-4 openai/gpt-4o
```

## Pipeline stages

### `generate-seeds`

Generates a set of scenario seeds from the risk taxonomy.

```bash
yarn kora generate-seeds <model> [output-path]
```

| Argument | Description |
|---|---|
| `<model>` | Model to use for seed generation |
| `[output-path]` | Output JSONL file (default: `data/seeds.jsonl`) |

### `expand-scenarios`

Transforms seeds into fully fleshed-out scenarios with validation.

```bash
yarn kora expand-scenarios <model> <user-model> [seeds-path] [output-path]
```

| Argument | Description |
|---|---|
| `<model>` | Model to use for scenario expansion |
| `<user-model>` | Model to use for generating the first user message |
| `[seeds-path]` | Input seeds JSONL file (default: `data/seeds.jsonl`) |
| `[output-path]` | Output scenarios JSONL file (default: `data/scenarios.jsonl`) |

### `run`

Runs the benchmark against the target model.

```bash
yarn kora run <judge-model> <user-model> <target-model> [scenarios-path] [output-path]
```

| Argument | Description |
|---|---|
| `<judge-model>` | Model to use as judge |
| `<user-model>` | Model to use for simulating the child user |
| `<target-model>` | Model to benchmark |
| `[scenarios-path]` | Input scenarios JSONL file (default: `data/scenarios.jsonl`) |
| `[output-path]` | Output results JSON file (default: `data/results.json`) |

All commands write to `data/` by default. Commands are restartable — progress is tracked via temp files so interrupted runs resume where they left off.

## Model slugs

Models are specified in `anthropic/model-name` format. Only Anthropic models are supported.

Examples:

- `anthropic/claude-sonnet-4`
- `anthropic/claude-sonnet-4-5`

Authentication is handled via the `ANTHROPIC_API_KEY` environment variable.

## Evaluating a different model

To evaluate a new model, only change the `<target-model>` argument in the `run` command. Keep the judge and user models the same across evaluations for comparability.

## Risk taxonomy

The benchmark covers 8 risk categories with 25 individual risks:

| Category ID | Name |
|---|---|
| `physical_and_legal_safety` | Physical & Legal Safety |
| `sexual_content_exploitation_and_predation` | Sexual Content, Exploitation & Predation |
| `psychological_and_emotional_safety` | Psychological & Emotional Safety |
| `educational_and_epistemic_integrity` | Educational & Epistemic Integrity |
| `bias_hate_and_societal_harm` | Bias, Hate & Societal Harm |
| `social_family_and_behavioral_influence` | Social, Family & Behavioral Influence |
| `online_safety` | Online Safety |
| `developmental_risk` | Developmental Risk |

See the full taxonomy: [KORA Risk Taxonomy](https://korabench.notion.site/KORA-Risk-Taxonomy-2fb5eb9ec0c98050b330d4f37c57d5b0).

In addition to safety, each conversation is assessed on three behavioral criteria:

- **Anthropomorphism** — anthropomorphic cues that make the AI appear more human-like.
- **Epistemic humility** — confident hallucinations vs. appropriate admission of limits.
- **Human redirection** — redirection to trusted humans in high-stakes moments.

## Interpreting results

The `run` command produces a result object with this structure:

```json
{
  "scores": [
    {
      "riskCategoryId": "...",
      "riskId": "...",
      "ageRange": "7to9",
      "prompt": "default",
      "sums": {
        "al": 42,
        "as": [3, 25, 14],
        "an": [1, 30, 11, 35],
        "eh": [0, 28, 14, 40],
        "hr": [2, 26, 14, 38]
      }
    }
  ]
}
```

| Field | Description |
|---|---|
| `sums.al` | Total test count |
| `sums.as` | Safety grades: `[failing, adequate, exemplary]` |
| `sums.an` | Anthropomorphism: `[failing, adequate, exemplary, occurrenceCount]` |
| `sums.eh` | Epistemic humility: `[failing, adequate, exemplary, occurrenceCount]` |
| `sums.hr` | Human redirection: `[failing, adequate, exemplary, occurrenceCount]` |

Scores are grouped by risk category, risk, age range, and prompt variant. Two prompt variants are used:

- **`default`** — no age context in the system prompt.
- **`child`** — the system prompt includes the child's age range.

## Cost and duration

Each pipeline stage makes the following API calls:

- **Seed generation**: 1 call per (risk x age range x motivation) combination = 25 x 3 x 10 = **750 calls**, producing 8 seeds each (6,000 seeds total).
- **Scenario expansion**: 3–5 calls per seed (1 generate + 1 validate + 1 first user message on pass; up to 2 generate + 2 validate + 1 first user message on retry).
- **Test run**: 7 calls per test (2 user responses + 3 target model responses + 2 judge responses), with 2 tests per scenario (`default` + `child`).

All commands run with a concurrency of 10 parallel tasks.

## Project structure

```
src/
  cli/           CLI command implementations
  model/         Data types and validation schemas
  prompts/       Prompt templates for each pipeline stage
  __tests__/     Test suites
  benchmark.ts   Core benchmark interface
  kora.ts        KORA benchmark implementation
  index.ts       Public API exports
data/            Risk taxonomy, motivations, scenario data
```

## Development

```bash
yarn tsbuild      # Type check
yarn test          # Run tests
yarn lint          # Lint
yarn pretty        # Check formatting
```

## MyDD Chat Endpoint Integration — Changelog

The following changes were made to support benchmarking the MyDD deployed chat endpoint as the target model, instead of calling an LLM directly via the Vercel AI SDK.

### New file: `src/cli/chatEndpoint.ts`

HTTP client for the MyDD chat endpoint. Three exports:

- **`ageRangeToAge(ageRange: AgeRange): number`** — Converts the benchmark's age range strings to a representative integer age for the endpoint: `"7to9"` → `8`, `"10to12"` → `11`, `"13to17"` → `15`.

- **`restoreChatEndpointMemory(baseUrl, sessionId, age, modelMemory)`** — POSTs to `/restore_session_memory` to pre-load a scenario's `modelMemory` into the endpoint's conversation history. The memory is injected as a synthetic two-message exchange (`user: <modelMemory>`, `assistant: "I'll keep that in mind."`).

- **`getChatEndpointResponse(baseUrl, sessionId, age, prompt)`** — POSTs to `/query_chat_langchain_mem?session_id={sessionId}` with `{prompt, age}` in the body. Returns the `response` string from the JSON response.

Both HTTP functions use an internal `fetchWithRetry` helper that retries up to 5 times with exponential backoff (1 s, 2 s, 4 s, 8 s, 16 s, capped at 30 s), matching the `maxRetries: 5` used by the existing Vercel AI SDK calls in `model.ts`.

### Modified file: `src/cli/model.ts`

Replaced the Vercel AI Gateway with the Anthropic provider SDK (`@ai-sdk/anthropic`), removing the need for a Vercel gateway key.

- **Removed**: `gateway` import from `ai`.
- **Added**: `createAnthropic` import from `@ai-sdk/anthropic`.
- **New function: `resolveModel(modelSlug)`** — Parses a slug like `anthropic/claude-sonnet-4`, validates the `anthropic/` prefix, and returns an Anthropic provider model instance. Throws if the provider is not `anthropic`.
- Both `getStructuredResponse` and `getTextResponse` now call `resolveModel(modelSlug)` instead of `gateway(modelSlug)`.

### Modified file: `src/cli/runCommand.ts`

#### New imports

```ts
import {v4 as uuid} from "uuid";
import {ScenarioKey} from "../model/scenarioKey.js";
import {ageRangeToAge, getChatEndpointResponse, restoreChatEndpointMemory} from "./chatEndpoint.js";
```

#### New function: `isUrlTarget(targetModelSlug)`

Returns `true` when the target model slug starts with `http://` or `https://`, signalling the target is a chat endpoint URL rather than a Vercel AI SDK model slug.

#### Modified function: `scenariosToTestTasks(filePath, skipDefault)`

Added a second parameter `skipDefault: boolean`. When `true`, keys ending in `":default"` are skipped. The "default" prompt variant tests a model without age context, but the MyDD endpoint always requires an age parameter, so these tests are not applicable.

#### Modified function: `countTestTasks(filePath, skipDefault)`

Same `skipDefault` parameter added. When `true`, keys ending in `":default"` are excluded from the count so the progress bar total is accurate.

#### New function: `createStandardContext(judgeModelSlug, userModelSlug, targetModelSlug)`

Extracted from the inline `context` object that was previously defined at the top of `runCommand`. This is the original behavior — all three roles (user, assistant, judge) call the Vercel AI SDK. No behavioral change.

#### New function: `createChatEndpointContext(judgeModelSlug, userModelSlug, targetBaseUrl, taskKey, scenario)`

Creates a per-test `TestContext` for URL-based targets:

1. Generates a unique `sessionId` in `{uuid}_{uuid}` format (matches the endpoint's required format).
2. Parses the test key to extract `ageRange`, then maps it to an integer age via `ageRangeToAge`.
3. If the scenario has `modelMemory`, calls `restoreChatEndpointMemory` to seed the conversation history before any test turns.
4. `getUserResponse` and `getJudgeResponse` are identical to the standard context (Vercel AI SDK).
5. `getAssistantResponse` extracts the last user message from the messages array and sends only that message to `getChatEndpointResponse`. The endpoint is stateful (it accumulates messages server-side), so sending the full history would cause duplication.

#### Modified function: `runCommand`

- At the top, checks `isUrlTarget(targetModelSlug)`. If `true`, `standardContext` is `undefined`; otherwise it is created once via `createStandardContext`.
- Passes `isUrl` to both `countTestTasks` and `scenariosToTestTasks` as the `skipDefault` flag.
- Inside the `flatTransform` callback: when `isUrl` is `true`, calls `createChatEndpointContext` to create a fresh context per test (ensuring session isolation). When `false`, uses the shared `standardContext` (original behavior).

### Files NOT changed

- **`src/cli.ts`** — No changes. The CLI argument parsing is the same; URL detection happens in `runCommand.ts`.
- **`src/cli/model.ts`** — Modified (see above), but still used for user/judge roles even when the target is a URL.
- **`src/kora.ts`** — No changes. The `runTest` function receives a `TestContext` and is unaware of whether the assistant response comes from the AI SDK or the chat endpoint.
- **`src/benchmark.ts`** — No changes. The `TestContext` interface is unchanged.
- **All other model types, prompts, seed generation, and scenario expansion** — No changes except `src/model/scenarioValidation.ts` (see below).
- **One new dependency** — `@ai-sdk/anthropic` (replaces the Vercel AI Gateway). `uuid` was already in the project. Native `fetch` is used (Node 25+).

### Schema `maxLength` increases across model types

Sonnet 4.5 is more verbose than the model originally used to calibrate these limits, causing validation crashes during `expand-scenarios` and `run`. All `maxLength` constraints on model-generated fields were doubled to provide headroom:

| File | Field | Old | New |
|---|---|---|---|
| `src/model/scenarioValidation.ts` | `reasons` | 500 | 2000 |
| `src/model/scenario.ts` | `modelMemory` | 1000 | 2000 |
| `src/model/scenario.ts` | `shortTitle` | 60 | 120 |
| `src/model/scenario.ts` | `childMaturity` | 500 | 1000 |
| `src/model/scenario.ts` | `childBackground` | 500 | 1000 |
| `src/model/scenario.ts` | `narrative` | 2000 | 4000 |
| `src/model/scenario.ts` | `evaluationCriteria` | 1000 | 2000 |
| `src/model/behaviorAssessment.ts` | `reasons` | 500 | 1000 |
| `src/model/testAssessment.ts` | `reasons` | 1000 | 2000 |

### Modified file: `src/model/behaviorAssessment.ts`

Removed `v.minValue(0)` from the `occurrenceCount` field. The Anthropic API does not support `minimum`/`maximum` properties in structured output schemas, causing all `run` tests to fail with `output_format.schema: For 'number' type, property 'minimum' is not supported`.

### Usage

```bash
# Standard benchmark (direct Anthropic model)
yarn kora:env run anthropic/claude-sonnet-4 anthropic/claude-sonnet-4 anthropic/claude-sonnet-4

# MyDD endpoint benchmark
yarn kora:env run anthropic/claude-sonnet-4 anthropic/claude-sonnet-4 <your-endpoint-url>
```

The first two arguments (judge and user models) are Anthropic model slugs. Only the third argument (target) accepts a URL.

## MyDD Benchmark Results

Run on February 6, 2026. 5,768 tests (child prompt variant only) across 25 risks, 3 age groups, using Claude Sonnet 4.5 as judge and user model.

### Overall

| Criterion | Failing | Adequate | Exemplary |
|---|---|---|---|
| Safety | 7.2% | 3.1% | **89.8%** |
| Anthropomorphism | 0.1% | 23.0% | **76.9%** |
| Epistemic Humility | 0.4% | 2.4% | **97.2%** |
| Human Redirection | 5.0% | 22.5% | **72.4%** |

### Compared to the KORA Leaderboard (korabench.ai, Jan 28 2026)

| Model | Safety |
|---|---|
| **MyDD** | **~90%** |
| Claude Haiku 4.5 | 76% |
| Claude Opus 4.6 | 76% |
| GPT-5.2 | 75% |
| Claude Sonnet 4.5 | 74% |

Note: leaderboard models are tested with both prompt variants (`default` + `child`). MyDD only uses `child` since the endpoint always has age context, which is a favorable condition.

### Safety by Risk Category

| Risk Category | Failing | Exemplary |
|---|---|---|
| Sexual Content, Exploitation & Predation | 0.8% | 98.2% |
| Online Safety | 1.9% | 97.2% |
| Bias, Hate & Societal Harm | 1.9% | 97.0% |
| Physical & Legal Safety | 2.3% | 96.4% |
| Social, Family & Behavioral Influence | 3.2% | 95.5% |
| Educational & Epistemic Integrity | 7.5% | 90.8% |
| Psychological & Emotional Safety | 9.6% | 85.2% |
| Developmental Risk | 28.3% | 61.9% |

### Developmental Risk Breakdown

This was the weakest category. The three sub-risks:

| Sub-Risk | Failing | Adequate | Exemplary |
|---|---|---|---|
| Cognitive Atrophy & Dependency | 37.9% | 4.3% | 57.9% |
| Cognitive Mismatch | 30.1% | 23.0% | 46.9% |
| Rigid Worldview Shaping | 17.2% | 2.1% | 80.8% |

By sub-risk and age group:

| Sub-Risk | 7-9 Failing | 10-12 Failing | 13-17 Failing |
|---|---|---|---|
| Cognitive Atrophy & Dependency | 46.8% | 34.6% | 32.1% |
| Cognitive Mismatch | 26.3% | 32.9% | 31.3% |
| Rigid Worldview Shaping | 18.8% | 10.1% | 22.5% |

**Key finding**: Cognitive Atrophy & Dependency for ages 7-9 is the worst combination (46.8% failing). The system tends to give complete, helpful answers to young children when it should be scaffolding their thinking — asking questions back, encouraging them to try, giving hints rather than solutions.

## License

Apache-2.0
