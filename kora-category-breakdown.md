# KORA Safety — Per-Category Breakdown Across Runs

Exemplary / Adequate / Failing percentages from the **Safety Assessment** (`as`) grade,
per risk category, for each run we have data for.

| Category | Run 1 — Exemplary | Run 1 — Adequate | Run 1 — Failing | After-prompts — Exemplary | After-prompts — Adequate | After-prompts — Failing | After-PR8 — Exemplary | After-PR8 — Adequate | After-PR8 — Failing |
|---|---|---|---|---|---|---|---|---|---|
| Sexual content/exploitation/predation | 98.2% | 1.0% | 0.8% | 99.1% | 0.9% | 0.0% | 98.3% | 1.7% | 0.0% |
| Bias, hate & societal harm | 97.0% | 1.1% | 1.9% | 98.9% | 0.0% | 1.1% | 100.0% | 0.0% | 0.0% |
| Online safety | 97.2% | 0.9% | 1.9% | 100.0% | 0.0% | 0.0% | 98.3% | 1.7% | 0.0% |
| Physical & legal safety | 96.4% | 1.3% | 2.3% | 98.9% | 0.0% | 1.1% | 98.9% | 1.1% | 0.0% |
| Social, family & behavioral influence | 95.5% | 1.3% | 3.2% | 98.9% | 0.0% | 1.1% | 97.8% | 0.0% | 2.2% |
| Educational & epistemic integrity | 90.8% | 1.7% | 7.5% | 93.2% | 5.1% | 1.7% | 96.6% | 1.7% | 1.7% |
| Psychological & emotional safety | 85.2% | 5.2% | 9.6% | 94.0% | 0.7% | 5.4% | 96.0% | 2.0% | 2.0% |
| Developmental risk | 61.9% | 9.8% | 28.3% | 81.4% | 9.3% | 9.3% | 77.9% | 12.8% | 9.3% |

## Notes

- **Run 1 `Adequate` is derived** (`100 − exemplary − failing`). `BENCHMARK_RESULTS.md` only
  published exemplary and failing per category, so the Run 1 adequate column carries rounding.
  The after-prompts and after-PR8 columns are computed exactly from the JSON result files.
- **Run 1 is not apples-to-apples** with the later runs: it used the `gpt-5.2` judge and
  `deepseek-v3.2` user simulator, while after-prompts and after-PR8 both used
  `claude-sonnet-4-5`. The judge swap shifts grades, so read Run 1 → later runs as
  *directional*. The after-prompts → after-PR8 comparison is the only controlled one.
- **Headline signal:** developmental risk climbs from 61.9% → ~78–81% exemplary and its
  failing rate drops from 28.3% → 9.3%, while every other category stays in the 96–100%
  exemplary range throughout.

## Sources

- Run 1 baseline: `BENCHMARK_RESULTS.md`
- After-prompts: `data/results-after-prompts.json`
- After-PR8: `data/results-after-pr8.json`
