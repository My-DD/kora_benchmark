# KORA Safety — Per-Category Breakdown Across Runs

Exemplary / Adequate / Failing percentages from the **Safety Assessment** (`as`) grade,
per risk category, for each run we have data for.

| Category | Run 1 — Exemplary | Run 1 — Adequate | Run 1 — Failing | After-prompts — Exemplary | After-prompts — Adequate | After-prompts — Failing | After-PR8 — Exemplary | After-PR8 — Adequate | After-PR8 — Failing | After-PR9 — Exemplary | After-PR9 — Adequate | After-PR9 — Failing |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sexual content/exploitation/predation | 98.2% | 1.0% | 0.8% | 99.1% | 0.9% | 0.0% | 98.3% | 1.7% | 0.0% | 100.0% | 0.0% | 0.0% |
| Bias, hate & societal harm | 97.0% | 1.1% | 1.9% | 98.9% | 0.0% | 1.1% | 100.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.0% |
| Online safety | 97.2% | 0.9% | 1.9% | 100.0% | 0.0% | 0.0% | 98.3% | 1.7% | 0.0% | 100.0% | 0.0% | 0.0% |
| Physical & legal safety | 96.4% | 1.3% | 2.3% | 98.9% | 0.0% | 1.1% | 98.9% | 1.1% | 0.0% | 100.0% | 0.0% | 0.0% |
| Social, family & behavioral influence | 95.5% | 1.3% | 3.2% | 98.9% | 0.0% | 1.1% | 97.8% | 0.0% | 2.2% | 100.0% | 0.0% | 0.0% |
| Educational & epistemic integrity | 90.8% | 1.7% | 7.5% | 93.2% | 5.1% | 1.7% | 96.6% | 1.7% | 1.7% | 93.2% | 0.0% | 6.8% |
| Psychological & emotional safety | 85.2% | 5.2% | 9.6% | 94.0% | 0.7% | 5.4% | 96.0% | 2.0% | 2.0% | 96.6% | 0.0% | 3.4% |
| Developmental risk | 61.9% | 9.8% | 28.3% | 81.4% | 9.3% | 9.3% | 77.9% | 12.8% | 9.3% | 81.4% | 10.5% | 8.1% |

## Behavioral criteria

Beyond the top-level safety assessment, KORA scores three behavioral sub-criteria on the
same Exemplary / Adequate / Failing scale. These are aggregated across all categories and
age ranges (each criterion also carries an occurrence count, which is not a grade and is
omitted here).

| Criterion | Run 1 — Exemplary | Run 1 — Adequate | Run 1 — Failing | After-prompts — Exemplary | After-prompts — Adequate | After-prompts — Failing | After-PR8 — Exemplary | After-PR8 — Adequate | After-PR8 — Failing | After-PR9 — Exemplary | After-PR9 — Adequate | After-PR9 — Failing |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Epistemic humility | 97.2% | 2.4% | 0.4% | 99.3% | 0.4% | 0.3% | 98.9% | 1.0% | 0.1% | 98.6% | 1.2% | 0.1% |
| Human redirection | 72.4% | 22.6% | 5.0% | 75.3% | 20.7% | 4.1% | 75.8% | 18.6% | 5.6% | 75.4% | 20.9% | 3.7% |
| Anthropomorphism | 76.9% | 23.0% | 0.1% | 79.9% | 20.1% | 0.0% | 74.6% | 25.3% | 0.1% | 80.9% | 19.1% | 0.0% |

## Notes

- **Run 1 `Adequate` is derived** (`100 − exemplary − failing`). `BENCHMARK_RESULTS.md` only
  published exemplary and failing per category, so the Run 1 adequate column carries rounding.
  The after-prompts, after-PR8, and after-PR9 columns are computed exactly from the JSON result files.
- **Run 1 is not apples-to-apples** with the later runs: it used the `gpt-5.2` judge and
  `deepseek-v3.2` user simulator, while after-prompts, after-PR8, and after-PR9 all used
  `claude-sonnet-4-5-20250929` as both judge and user. The judge swap shifts grades, so read
  Run 1 → later runs as *directional*. The after-prompts → after-PR8 → after-PR9 comparisons
  are the controlled ones.
- **Scenario count differs slightly:** after-prompts and after-PR8 cover 736 scenarios (one
  scenario hit a server-side HTTP 500), while after-PR9 (Run 4) completed all **737**. Treat
  sub-percentage-point moves as noise.
- **After-PR9 (Run 4) is the crisis-protocol change** (PR #9: deliver crisis resources, then
  end cleanly — no trailing follow-up question). Overall safety is steady-to-up (95.5% → 96.6%
  exemplary), five categories sit at 100%, developmental risk improves (77.9% → 81.4%), and
  human-redirection *failing* drops (5.6% → 3.7%) — no regression attributable to the crisis
  change. The one dip is **Educational & epistemic integrity** (96.6% → 93.2%), which given
  judge variance and the single-run sample should be read as directional, not conclusive.
- **Headline signal:** developmental risk climbs from 61.9% → ~78–81% exemplary and its
  failing rate drops from 28.3% → 8–9%, while every other category stays in the 93–100%
  exemplary range throughout.

## Sources

- Run 1 baseline: `BENCHMARK_RESULTS.md`
- After-prompts: `data/results-after-prompts.json`
- After-PR8: `data/results-after-pr8.json`
- After-PR9 (Run 4, crisis-no-followup): `data/results-after-pr9.json`
