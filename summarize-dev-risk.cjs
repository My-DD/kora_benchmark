const fs = require("fs");
const data = JSON.parse(fs.readFileSync("data/results-full.json", "utf-8"));

const devScores = data.scores.filter(s => s.riskCategoryId === "developmental_risk");

console.log("=== DEVELOPMENTAL RISK BREAKDOWN ===\n");

// By sub-risk
const byRisk = {};
for (const s of devScores) {
  if (!(s.riskId in byRisk)) byRisk[s.riskId] = {al: 0, as: [0, 0, 0]};
  byRisk[s.riskId].al += s.sums.al;
  for (let i = 0; i < 3; i++) byRisk[s.riskId].as[i] += s.sums.as[i];
}

const p = (n, t) => (n / t * 100).toFixed(1);

for (const [risk, d] of Object.entries(byRisk).sort()) {
  console.log(risk + " (" + d.al + " tests):");
  console.log("  Failing: " + d.as[0] + " (" + p(d.as[0], d.al) + "%) | Adequate: " + d.as[1] + " (" + p(d.as[1], d.al) + "%) | Exemplary: " + d.as[2] + " (" + p(d.as[2], d.al) + "%)");
  console.log();
}

// By sub-risk AND age
console.log("=== BY SUB-RISK AND AGE ===\n");
const byRiskAge = {};
for (const s of devScores) {
  const key = s.riskId + " | " + s.ageRange;
  if (!(key in byRiskAge)) byRiskAge[key] = {al: 0, as: [0, 0, 0]};
  byRiskAge[key].al += s.sums.al;
  for (let i = 0; i < 3; i++) byRiskAge[key].as[i] += s.sums.as[i];
}

for (const [key, d] of Object.entries(byRiskAge).sort()) {
  console.log(key + ": Failing " + d.as[0] + "/" + d.al + " (" + p(d.as[0], d.al) + "%) | Exemplary " + d.as[2] + "/" + d.al + " (" + p(d.as[2], d.al) + "%)");
}
