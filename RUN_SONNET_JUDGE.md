# Reproduce: Run 1 judge/user (Claude Sonnet, direct) × small batch (737 tests)

This is a step-by-step guide to run the KORA benchmark against the MyDD endpoint using:

- **Test set:** the **small batch** — the 737 scenarios from Run 2 (`data/scenarios.jsonl`, `child` prompt only)
- **Judge + user:** Claude Sonnet, called **directly via the Anthropic API** (the way Run 1 ran — **no Vercel AI Gateway**)
- **Target:** `custom-mydd` (the MyDD chat endpoint)

> **No gateway needed.** Slugs that start with `anthropic/` go straight to the Anthropic API (`ANTHROPIC_API_KEY`), bypassing the Vercel AI Gateway and `models.json`. The `custom-mydd` target talks to the MyDD endpoint directly. So this run uses **no `AI_GATEWAY_API_KEY` at all**.

---

## 0. Prerequisites

You need these installed and on hand before starting:

- **Node.js 25+** — check with `node --version` (repo targets `v25.2.1`; see `.nvmrc`)
- **Yarn** — check with `yarn --version`
- **git** with access to the `My-DD/kora_benchmark` GitHub repo
- An **Anthropic API key** (for the judge + user models)
- The **MyDD endpoint URL** (the API being benchmarked, e.g. `https://mydd-dev.fly.dev`)

If `node --version` is below 25, install Node 25+ first (e.g. via `nvm install 25 && nvm use 25`).

---

## 1. Get the latest code from GitHub

**If you do NOT have the repo yet** — clone it:

```bash
git clone git@github.com:My-DD/kora_benchmark.git
cd kora_benchmark
```

**If you ALREADY have the repo** — pull the latest `main`:

```bash
cd kora_benchmark
git checkout main
git pull origin main
```

Confirm you're on `main` and up to date:

```bash
git status        # should say "On branch main" / "up to date"
git log --oneline -3
```

The direct-Anthropic routing lives in `packages/cli/src/models/anthropicModel.ts` — if that file is missing, you don't have the latest code; re-run the pull.

---

## 2. Add your API keys to a `.env` file

Create the `.env` from the template:

```bash
cp .env.example .env
```

Open `.env` in an editor and set these two values:

```
ANTHROPIC_API_KEY=sk-ant-...your Anthropic key...
MYDD_ENDPOINT_URL=https://mydd-dev.fly.dev
```

Notes:

- Replace the `MYDD_ENDPOINT_URL` value with the actual MyDD API base URL you're testing (no trailing slash needed).
- `AI_GATEWAY_API_KEY` may already be in the file — **leave it as-is or blank; it is not used for this run.**
- `.env` is gitignored — your keys are never committed. Do not paste real keys into any other file.

---

## 3. Install dependencies and build

```bash
yarn
yarn tsbuild
```

`yarn` installs packages; `yarn tsbuild` compiles the TypeScript. Both must finish without errors before running. No `models.json` edit is needed — `anthropic/...` judge/user slugs skip the registry entirely.

---

## 4. Run the small batch (737 tests)

```bash
yarn kora:env run custom-mydd \
  anthropic/claude-sonnet-4.5 \
  anthropic/claude-sonnet-4.5 \
  -i data/scenarios.jsonl \
  --prompts child \
  -o data/results-sonnet-judge.json
```

> Use **`kora:env`** (not `kora`) — it loads the `.env` file via `--env-file=.env` so your `ANTHROPIC_API_KEY` and `MYDD_ENDPOINT_URL` are picked up. Plain `yarn kora` does **not** read `.env`; with it you'd have to `export` the variables in your shell first.

What each piece means:

| Part | Meaning |
|---|---|
| `custom-mydd` | **target** — the model being tested (routes to the MyDD endpoint) |
| `anthropic/claude-sonnet-4.5` (1st) | **judge** model — direct Anthropic |
| `anthropic/claude-sonnet-4.5` (2nd) | **user** simulator model — direct Anthropic |
| `-i data/scenarios.jsonl` | the **small batch** input: 737 scenarios |
| `--prompts child` | use the age-aware prompt only (so 737 scenarios = 737 tests) |
| `-o data/results-sonnet-judge.json` | where aggregated results are written |

Judge and user use the **same** model, matching Run 1. To use a different Sonnet, change both ids together (e.g. `anthropic/claude-sonnet-4.6`).

**Progress and restarts:** the run prints a progress bar and writes per-test temp files to `data/.kora-run-tmp/`. If it's interrupted or some tests fail, just re-run the exact same command — it resumes where it left off. The run is complete when it prints `Completed <N> tests → data/results-sonnet-judge.json`.

---

## 5. Review the results

Aggregated scores are in `data/results-sonnet-judge.json`, including `target` / `judge` / `user` / `prompts` metadata at the top. Compare against `data/results.json` (the original Run 2, which used the gpt-5.2 judge via the gateway) to see how switching to a direct Sonnet judge moves the safety and behavioral grades.

---

## How the no-gateway routing works

| Slug pattern | Routed to | Auth |
|---|---|---|
| `anthropic/<model-id>` | Anthropic API directly (`models/anthropicModel.ts`) | `ANTHROPIC_API_KEY` |
| `custom-*` | MyDD endpoint (`models/customModel.ts`) | `MYDD_ENDPOINT_URL` |
| anything else | Vercel AI Gateway via `models.json` | `AI_GATEWAY_API_KEY` |

The first two paths need no gateway, so a fully-direct run (Anthropic judge/user + `custom-mydd` target) never touches Vercel.

---

## Troubleshooting

- **`requires the ANTHROPIC_API_KEY environment variable`** — `ANTHROPIC_API_KEY` is missing/blank in `.env`, or you ran `yarn kora` instead of `yarn kora:env` (only `kora:env` loads `.env`).
- **`requires the MYDD_ENDPOINT_URL environment variable`** — set `MYDD_ENDPOINT_URL` in `.env`.
- **`Unknown model "..."`** — a non-`anthropic/`, non-`custom-` slug was passed and isn't in `models.json`. Check the command's model arguments.
- **`anthropicModel.ts` not found / build errors about it** — you're on stale code; redo step 1 (`git pull origin main`) then `yarn && yarn tsbuild`.
- **Model id rejected by Anthropic** — adjust the model id (e.g. a dated snapshot like `anthropic/claude-sonnet-4-5-YYYYMMDD`) to one your Anthropic account can access.

---

## Prompt you can paste into Claude Code

> In this KORA benchmark repo, run the small batch (737-scenario Run 2 set: `data/scenarios.jsonl`, `child` prompt only) against the `custom-mydd` target, using Claude Sonnet as **both** judge and user, called **directly via the Anthropic API (no Vercel gateway)**. First `git pull origin main`. Make sure `.env` has `ANTHROPIC_API_KEY` and `MYDD_ENDPOINT_URL` set, then `yarn && yarn tsbuild` and run:
> `yarn kora:env run custom-mydd anthropic/claude-sonnet-4.5 anthropic/claude-sonnet-4.5 -i data/scenarios.jsonl --prompts child -o data/results-sonnet-judge.json`
> Then summarize the safety + behavioral grades and compare them to `data/results.json`.
