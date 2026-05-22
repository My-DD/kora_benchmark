# Reproduce: Run 1 judge/user (Claude Sonnet) × Run 2 test set (737)

This runs the KORA benchmark against the MyDD endpoint using:

- **Test set:** the 737 scenarios from Run 2 (`data/scenarios.jsonl`, `child` prompt only)
- **Judge + user:** Claude Sonnet (the model family used in Run 1), routed through the Vercel AI Gateway
- **Target:** `custom-mydd` (the MyDD chat endpoint)

> **Fidelity note.** Run 1 called Claude *directly* via the Anthropic API (old `createAnthropic()` code). The current codebase only supports the Vercel AI Gateway, so this routes the *same Sonnet model* through the gateway instead. Same model, different transport/auth. Reproducing the original direct-Anthropic path would require reverting the model layer and is not recommended.

---

## What "the 737 tests from Run 2" means

`data/scenarios.jsonl` contains exactly **737 scenarios** (25 risks × 3 age groups, ~10 each). Running it with `--prompts child` produces 737 tests — that *is* the Run 2 set. Do not regenerate seeds/scenarios; use this file as-is.

---

## Prerequisites

- Node.js **25+** and **Yarn**
- A **Vercel AI Gateway** API key (the gateway can route both Anthropic and the user model)
- The **MyDD endpoint URL** (the API to benchmark)

---

## Steps

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` so it contains:

```
AI_GATEWAY_API_KEY=<your Vercel AI Gateway key>
MYDD_ENDPOINT_URL=<the MyDD API base URL>
```

`AI_GATEWAY_API_KEY` powers the judge and user models. `MYDD_ENDPOINT_URL` is the API being tested (the `custom-mydd` target POSTs to `/query_chat_langchain_mem`).

### 2. Add the Sonnet model to `models.json`

Add this entry to `models.json` at the repo root:

```json
"claude-sonnet": {
  "model": "anthropic/claude-sonnet-4.5"
}
```

> Model slugs must exist in `models.json` — raw `provider/model` strings are rejected. Bump to a newer Sonnet (e.g. `anthropic/claude-sonnet-4.6`) if you prefer; keep judge and user identical, as Run 1 did.

### 3. Install and build

```bash
yarn && yarn tsbuild
```

### 4. Run the benchmark

```bash
yarn kora run custom-mydd claude-sonnet claude-sonnet \
  -i data/scenarios.jsonl \
  --prompts child \
  -o data/results-sonnet-judge.json
```

Argument order is `run <target> [judge] [user]`. Here target = `custom-mydd`, and **both judge and user = `claude-sonnet`** (matching Run 1, which used the same model for both).

The run is restartable — progress is tracked in `data/.kora-run-tmp`, so re-running resumes where it left off.

### 5. Review results

Aggregated scores land in `data/results-sonnet-judge.json` (with `target`/`judge`/`user`/`prompts` metadata). Compare against `data/results.json` (Run 2, gpt-5.2 judge) to see how the judge change moves the numbers.

---

## Prompt you can paste into Claude Code

> In this KORA benchmark repo, run the 737-scenario Run 2 test set (`data/scenarios.jsonl`, `child` prompt only) against the `custom-mydd` target, using Claude Sonnet as **both** judge and user. Add a `claude-sonnet` → `anthropic/claude-sonnet-4.5` entry to `models.json`, make sure `.env` has `AI_GATEWAY_API_KEY` and `MYDD_ENDPOINT_URL` set, then `yarn && yarn tsbuild` and run:
> `yarn kora run custom-mydd claude-sonnet claude-sonnet -i data/scenarios.jsonl --prompts child -o data/results-sonnet-judge.json`
> Then summarize the safety + behavioral grades and compare them to `data/results.json`.
