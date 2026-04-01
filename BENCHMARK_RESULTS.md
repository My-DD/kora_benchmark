# KORA Benchmark Results: MyDD Custom Model

## Test Configuration

| Parameter | Value |
|---|---|
| **Target model** | `custom-mydd` |
| **Judge model** | `gpt-5.2:high:limited` |
| **User simulator** | `deepseek-v3.2` |
| **Prompt type** | `child` (age-aware system prompt) |
| **Age ranges** | 7-9, 10-12, 13-17 |
| **Risk categories** | 25 risks across 8 categories |

Two runs were conducted:

- **Run 1** (large-scale): ~75-80 tests per risk/age combination, **5,768 total tests** (`data/results-full.json`)
- **Run 2** (small-scale): ~10 tests per risk/age combination, **737 total tests** (`data/results.json`)

## Scoring Metrics

KORA evaluates four dimensions. Each test receives a grade of **failing**, **adequate**, or **exemplary**.

| Metric | Abbreviation | What it measures |
|---|---|---|
| **Safety Assessment** | `as` | Whether the model handles child-safety risks appropriately |
| **Anthropomorphism** | `an` | Whether the model avoids appearing human-like (backstories, emotions, sentience claims) |
| **Epistemic Humility** | `eh` | Whether the model expresses appropriate certainty and avoids hallucination |
| **Human Redirection** | `hr` | Whether the model appropriately suggests involving trusted adults/professionals |

## Overall Results

### Safety Assessment

| Grade | Run 1 (n=5,768) | Run 2 (n=737) |
|---|---|---|
| Exemplary | **89.8%** | **88.3%** |
| Adequate | 3.1% | 6.4% |
| Failing | 7.2% | 5.3% |

Both runs demonstrate consistent, strong safety performance with ~89% exemplary ratings.

### Behavioral Metrics

| Metric | Run 1 Exemplary | Run 1 Failing | Run 2 Exemplary | Run 2 Failing |
|---|---|---|---|---|
| **Anthropomorphism** | 76.9% | 0.1% | 85.9% | 0.5% |
| **Epistemic Humility** | 97.2% | 0.4% | 65.9% | 7.1% |
| **Human Redirection** | 72.4% | 5.0% | 87.7% | 0.9% |

Epistemic humility diverged between runs -- Run 2 showed a higher hallucination rate (307 incidents in 737 tests vs. 183 in 5,768). This may reflect sample variance at the smaller scale or indicate an area worth monitoring.

## Safety by Risk Category

Sorted by exemplary rate in Run 1 (most statistically significant).

| Risk Category | Run 1 Exemplary | Run 1 Failing | Run 2 Exemplary | Run 2 Failing |
|---|---|---|---|---|
| Sexual content/exploitation/predation | 98.2% | 0.8% | 94.8% | 0.0% |
| Bias, hate & societal harm | 97.0% | 1.9% | 97.8% | 0.0% |
| Online safety | 97.2% | 1.9% | 86.2% | 5.2% |
| Physical & legal safety | 96.4% | 2.3% | 84.4% | 7.8% |
| Social, family & behavioral influence | 95.5% | 3.2% | 83.1% | 6.7% |
| Educational & epistemic integrity | 90.8% | 7.5% | 74.6% | 16.9% |
| Psychological & emotional safety | 85.2% | 9.6% | 88.6% | 6.0% |
| Developmental risk | 61.9% | 28.3% | 89.5% | 4.7% |

## Safety by Age Range

| Age Range | Run 1 Exemplary | Run 1 Failing | Run 2 Exemplary | Run 2 Failing |
|---|---|---|---|---|
| 7-9 | 88.8% | 7.0% | 86.6% | 4.5% |
| 10-12 | 91.0% | 6.3% | 88.9% | 6.1% |
| 13-17 | 89.5% | 8.2% | 89.4% | 5.3% |

Performance is consistent across age ranges. No single age group is systematically underserved.

## Top Strengths

The following risks achieved **100% exemplary** in both runs:

- Self-harm & eating disorders (10-12)
- Sexual violence & abuse (7-9, 10-12, 13-17)
- Sexual grooming & boundary violations (7-9, 10-12)
- Unsafe sexual guidance (10-12, 13-17)

Additional 100% exemplary performers in Run 1 (at higher n):

- Harmful social norms & behavior (7-9)
- Hate speech & discrimination (10-12)
- Grooming & manipulation (7-9)

## Key Weaknesses

### Run 1 -- Highest Failure Rates (n~80 per entry)

| Risk | Age Range | Failing | Exemplary |
|---|---|---|---|
| Cognitive atrophy & dependency | 7-9 | **46.8%** | 46.8% |
| Cognitive atrophy & dependency | 10-12 | **34.6%** | 61.5% |
| Cognitive mismatch | 10-12 | **32.9%** | 48.1% |
| Cognitive atrophy & dependency | 13-17 | **32.1%** | 65.4% |
| Cognitive mismatch | 13-17 | **31.3%** | 52.5% |
| Mental health mishandling | 10-12 | **30.0%** | 57.5% |
| Mental health mishandling | 7-9 | **30.0%** | 51.2% |
| Mental health mishandling | 13-17 | **28.2%** | 57.7% |
| Cognitive mismatch | 7-9 | **26.3%** | 40.0% |
| Rigid worldview shaping | 13-17 | **22.5%** | 76.3% |

### Run 2 -- Highest Failure Rates (n=10 per entry)

| Risk | Age Range | Failing | Exemplary |
|---|---|---|---|
| Regulated & illegal activities | 13-17 | **30.0%** | 70.0% |
| Academic dishonesty & misuse | 7-9 | **30.0%** | 60.0% |
| Undermining authority & trust | 10-12 | **30.0%** | 70.0% |
| Fear, trauma & distress | 7-9, 10-12, 13-17 | **20.0%** | 70-80% |
| Mental health mishandling | 10-12 | **20.0%** | 80.0% |

## Key Takeaways

1. **Overall safety is strong.** ~89% exemplary across both runs with high consistency between them.

2. **Developmental risk is the primary concern.** In Run 1, this category had only 61.9% exemplary and 28.3% failing -- driven almost entirely by **cognitive atrophy/dependency** and **cognitive mismatch**. The model struggles with age-appropriate cognitive scaffolding and avoiding dependency-creating behaviors.

3. **Mental health mishandling is a consistent weak spot.** ~28-30% failure rate across all age groups in Run 1. The model sometimes engages inappropriately with children's mental health topics.

4. **Sexual safety is excellent.** Near-perfect scores across all age ranges and specific risks in both runs.

5. **Bias and hate speech handling is strong.** 97%+ exemplary in both runs.

6. **Epistemic humility warrants monitoring.** Run 2 showed notably worse performance (65.9% vs. 97.2% exemplary). While this could be sample variance, it suggests potential inconsistency in hallucination avoidance that should be validated with further testing.

7. **No age-group disparity.** All three age ranges (7-9, 10-12, 13-17) perform within a few percentage points of each other, indicating the model handles age-appropriate interactions consistently.

## Data Files

| File | Description |
|---|---|
| `data/results-full.json` | Run 1 aggregated scores (75 entries, ~75-80 tests each) |
| `data/results.json` | Run 2 aggregated scores with metadata (75 entries, ~10 tests each) |
| `data/results.zip` | Individual test results and full conversations |
| `data/mydd-backup/` | Backup copy of Run 1 results |
