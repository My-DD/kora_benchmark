## Benchmark rerun: before/after scores

The 737-scenario KORA set was rerun against `mydd-dev` running this PR's prompts (merged to `dev`). One scenario consistently fails with a server-side HTTP 500 on both runs (pre-existing MyDD endpoint bug, filed separately), so **both runs cover the identical 736 scenarios**.

> **⚠️ Judge caveat — directional, not apples-to-apples.** The baseline was judged by `gpt-5.2:high:limited` via the Vercel AI Gateway; that key is no longer available, so this rerun was judged by `anthropic/claude-sonnet-4-5-20250929` (user simulator likewise switched from `deepseek-v3.2` to Sonnet 4.5). Judge choice is known to shift grades (see Run 1 vs Run 2 in BENCHMARK_RESULTS.md), so treat these numbers as **directional improvement**, not a controlled comparison. The behavioral-criteria breakdown (anthropomorphism / epistemic humility / human redirection) is omitted from this comment because the judge swap shifts those numbers heavily — human redirection "failing" moves 0.1% → 4.1% from judge strictness alone; the full data is in `results-after-prompts.json`.

### Overall safety (n = 736 both runs)

| Safety grade | Baseline (May 22, gpt-5.2 judge) | This PR (Sonnet 4.5 judge) |
|---|---|---|
| Exemplary | 90.9% | **95.5%** |
| Adequate | 6.0% | 1.8% |
| Failing | 3.1% (23/736) | **2.7% (20/736)** |

### Safety by risk category

| Category | Failing (before → after) | Exemplary (before → after) |
|---|---|---|
| Online safety | 6.9% → **0.0%** | 86.2% → **100.0%** |
| Physical & legal safety | 4.5% → 1.1% | 84.3% → 98.9% |
| Social, family & behavioral influence | 3.4% → 1.1% | 92.1% → 98.9% |
| Bias, hate & societal harm | 2.2% → 1.1% | 96.7% → 98.9% |
| Sexual content, exploitation & predation | 0.0% → 0.0% | 94.0% → 99.1% |
| Psychological & emotional safety | 4.0% → 5.4% | 87.9% → 94.0% |
| Educational & epistemic integrity | 0.0% → 1.7% | 96.6% → 93.2% |
| Developmental risk | 4.7% → 9.3% | 90.7% → 81.4% |

### The 23 previously-failing cells

All 16 risk/age cells targeted by this PR's new sections improved or held (failing counts, before → after; n≈10 per cell):

| Cell | Before → After |
|---|---|
| Fear/trauma/distress, 10–12 | 3 → **0** |
| Risky online behaviors, 13–17 | 2 → **0** |
| Regulated & illegal activities, 13–17 | 2 → **0** |
| Hate speech & discrimination, 7–9 | 2 → **0** |
| Mental health mishandling, 13–17 | 2 → 1 |
| Cognitive atrophy & dependency, 7–9 | 2 → 1 |
| Undermining authority & trust, 10–12 / 13–17 | 1+1 → **0** |
| Cybersecurity, 13–17 | 1 → **0** |
| Cognitive mismatch, 13–17 | 1 → **0** |
| Violence & physical harm, 10–12 | 1 → **0** |
| Risky online behaviors, 7–9 | 1 → **0** |
| Violence 7–9 / domestic harm 13–17 | 1 each → 1 each |

### Two cells worsened — transcript review says judge strictness, mostly

- **Mental health mishandling, 10–12 (1 → 4 failing).** The baseline failure was an explicit quasi-diagnosis ("real symptoms that match anxiety"). No transcript in the rerun contains category-sorting language — the banned behavior is gone. The new failures are subtler patterns the Sonnet judge penalizes (e.g., "Nothing is wrong with you" graded as clinical certainty; symptom inventorying read as severity assessment). One genuine refinement candidate: the model still recaps the child's symptoms back before redirecting.
- **Rigid worldview shaping, 13–17 (0 → 3 failing).** Sonnet judges decision-tree-style advice and even "moral questions don't have a math-like answer" as rigid framing. One transcript worth watching (rules got *more* specific under pushback), but nothing traces to this PR's additions.

At n≈10 per cell, single-count swings are noise; the category-level and overall movements are the meaningful signal.

### Scope note

These numbers reflect **this PR only**. The follow-up fixes in #8 (sequential-fact rule at 13–17, gambling rule at 10–12, slur coursework carve-out, quote restyle) were unmerged at run time and are not measured here.

**Data:** aggregate in `kora_benchmark/data/results-after-prompts.json`, all 736 judged conversations in `data/results-after-prompts.zip` (same structure as the baseline archive). Method note: the harness only writes its aggregate at zero failures, so with the one server-500 scenario excluded the aggregate was produced by the same reduction logic over the per-test files.
