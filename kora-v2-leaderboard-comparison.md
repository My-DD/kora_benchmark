# KORA v2 — Conversation-Score Comparison vs Leaderboard (Run 3, child-variant)

This is the **v2 mechanism-based** run, scored in KORA's leaderboard format, for comparing
MyDD's *conversation* performance against published models. It is **separate** from the v1
exemplary/adequate/failing tables in [`kora-category-breakdown.md`](kora-category-breakdown.md)
(different judge, different scoring system) — do not mix the two.

## Run configuration

| Field | Value |
|---|---|
| Target | `custom-mydd` (the Guide endpoint, child/age-gated) |
| Prompt variant | `child` only (MyDD is age-gated, so `default` doesn't apply) |
| Judge | `gpt-5.2:medium:limited` (KORA's official v2 default) |
| User simulator | `deepseek-v4-flash` |
| Scenarios | 780 of 781 (one scenario consistently fails with a server-side HTTP 500; excluded) |
| Source data | `data/results-run3-child.json` (gitignored) |

## Conversation-category scores

KORA's app score is a 50/50 average of (1) this **conversation score** and (2) a separate
**product-checks** score from 22 observable design checks. **We have only the conversation
half** — we have not run the 22 product checks — so this is **not** a full composite and is
**not directly comparable to a model's full leaderboard number**. It compares the
conversation half only.

Each scenario's safety grade is scored `failing=0 / adequate=1 / exemplary=2`, normalized to
a percentage, then aggregated into KORA's four conversation categories:

| Conversation category | **MyDD (Guide)** | SchoolAI | ChatGPT |
|---|---|---|---|
| Online safety | **83.9** | 48 | 25 |
| Physical & sexual | **92.4** | 67 | 39 |
| Psycho-social | **95.8** | 63 | 65 |
| Learning & dev | **89.4** | 57 | 45 |

## Overall (child run, n=780)

| Metric | Value |
|---|---|
| **Safety assessment — Exemplary %** | **88.1%** (adequate 7.9%, failing 4.0%) |
| Overall conversation score (`f0/a1/e2` normalized) | 92.0% |

> Note: "exemplary %" (88.1%) and the ordinal "conversation score" (92.0%) are **different
> metrics** on the same data — the exemplary % is the fraction graded exemplary; the
> conversation score gives partial credit for *adequate*. The four category numbers above are
> conversation scores, so 92.0% is their natural overall roll-up.

## Caveats (read before quoting)

- **Conversation half only.** No product-design-check score, so no full composite. SchoolAI's
  and ChatGPT's *full* leaderboard scores blend in their product-checks half; this is a
  conversation-vs-conversation comparison.
- **Category grouping is partly inferred.** KORA's 8 risk categories were rolled into the 4
  conversation categories by name. The one judgment call is `bias_hate_and_societal_harm →
  Psycho-social` (the only fit among the four; it barely moves the number). Confirm against
  KORA's official taxonomy before publishing.
- **Competitor numbers** (SchoolAI 48/67/63/57, ChatGPT 25/39/65/45) are as reported from the
  KORA leaderboard scorecards; not independently re-measured here.
- **Different methodology from the v1 tables.** This run uses the v2 mechanism scoring and the
  `gpt-5.2:medium` judge, vs the v1 Sonnet-judge exemplary/adequate/failing tables in
  `kora-category-breakdown.md`.
