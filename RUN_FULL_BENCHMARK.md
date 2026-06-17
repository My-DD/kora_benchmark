# Running the full MyDD benchmark

How to update your local clone and run the full KORA benchmark against the MyDD
endpoint, with the OpenAI judge and DeepSeek user simulator — no Vercel AI
Gateway required.

The pipeline is: **DeepSeek (simulated child user) ↔ MyDD endpoint (target) ↔
OpenAI `gpt-5.2` (judge)**, all calling provider APIs directly.

---

## 1. Prerequisites

- **Node `v24.14.0`** (pinned in `.nvmrc`). With nvm:
  ```bash
  nvm install   # reads .nvmrc
  nvm use
  ```
- **Yarn 4** (via Corepack, which ships with Node):
  ```bash
  corepack enable
  ```
- **API keys** (get these from Jacob):
  - `OPENAI_API_KEY` — judge (`gpt-5.2`)
  - `DEEPSEEK_API_KEY` — user simulator (`deepseek-v4-flash`)
  - `MYDD_ENDPOINT_URL` — the MyDD chat endpoint (the `custom-mydd` target)
  - `AI_GATEWAY_API_KEY` is **not** needed.

## 2. Update your local repo

From the repo root, get the latest `main` (or `dev` — they're identical):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
```

If `git pull --ff-only` fails because you have local commits/changes, stash or
commit them first (`git stash`), then pull, then reapply (`git stash pop`). Ask
Jacob if you hit conflicts — do not force anything.

## 3. Install dependencies & build

```bash
yarn install
yarn tsbuild   # TypeScript build — must pass with no errors
```

## 4. Configure your `.env`

Create a `.env` in the repo root (it is gitignored — never commit it). Copy the
template and fill in the three keys:

```bash
cp .env.example .env
```

Then edit `.env` so it contains at least:

```
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
MYDD_ENDPOINT_URL=https://...
```

## 5. Smoke test first (always)

Confirm everything is wired before the long run. This runs 1 scenario and
writes to a throwaway file:

```bash
yarn kora:env run custom-mydd --limit 1 -o data/results-smoke.json
```

Expect `✓ 1 ✗ 0`. If it fails, stop and check the error (usually a missing key
or the MyDD endpoint being down) before continuing.

## 6. Run the full benchmark

```bash
yarn kora:env run custom-mydd -o data/results-run3.json
```

What this does:
- target `custom-mydd` → the MyDD endpoint (fresh live responses)
- user `deepseek-v4-flash` (default) → simulates the child across turns
- judge `gpt-5.2:medium:limited` (default) → scores each conversation
- input `data/scenarios.jsonl` (default) → the full scenario set (~737 tests)
- output → `data/results-run3.json` (+ `data/results-run3.zip` with full
  per-conversation transcripts)

It will take a while (think tens of minutes to a few hours). It runs 10 tests
in parallel by default.

### Useful flags

| Flag | Purpose |
| --- | --- |
| `-o data/results-run3.json` | **Always set a fresh output name.** Without `-o` it overwrites the committed Run-2 archive (`data/results.json` / `data/results.zip`). |
| `--limit <n>` | Only run the first N tests (smoke tests). |
| `--concurrency <n>` | Parallel tests (default 10). Lower it if you hit rate limits. |
| `--risk-ids <a,b>` | Restrict to specific risk IDs. |

## 7. If it gets interrupted

The run is **resumable**. Completed tests are cached in
`data/.kora-run-tmp/`. Just re-run the exact same command and it picks up where
it left off. A transient failure on one test won't lose completed work; failed
tests are retried on the next run.

To start completely fresh instead, delete the temp dir first:
```bash
rm -rf data/.kora-run-tmp
```

## 8. Results

- `data/results-run3.json` — aggregate scores per risk/age/prompt.
- `data/results-run3.zip` — full transcripts + per-conversation judge
  assessments (`grade` + `reasons` + per-mechanism scores).

Send both to Jacob, or commit them on a branch (do **not** overwrite the
existing `data/results.json` / `data/results.zip`).

---

### Background (what changed and why)

- The benchmark was synced with upstream KORA (v2 mechanism-based scoring).
- The judge/user models now call OpenAI and DeepSeek **directly** (no Vercel AI
  Gateway). Routing lives in `packages/cli/src/models/directModel.ts`.
- DeepSeek deprecated `deepseek-v3.2` on the direct API, so the default user
  model is `deepseek-v4-flash` with **thinking disabled** (v4 reasons by
  default and would burn the 300-token user-message budget on reasoning,
  producing an empty message that the MyDD endpoint rejects with HTTP 400).
- See `README.md` → "Direct provider models (no gateway)" for full detail.
