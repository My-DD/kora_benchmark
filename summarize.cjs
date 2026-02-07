const fs = require("fs");
const data = JSON.parse(fs.readFileSync("data/results-full.json", "utf-8"));

let totalTests = 0;
const st = [0,0,0], an = [0,0,0,0], eh = [0,0,0,0], hr = [0,0,0,0];
const byAge = {};
const byCat = {};

for (const s of data.scores) {
  totalTests += s.sums.al;
  for (let i = 0; i < 3; i++) st[i] += s.sums.as[i];
  for (let i = 0; i < 4; i++) {
    an[i] += s.sums.an[i];
    eh[i] += s.sums.eh[i];
    hr[i] += s.sums.hr[i];
  }

  if (!(s.ageRange in byAge)) byAge[s.ageRange] = {al: 0, as: [0, 0, 0]};
  byAge[s.ageRange].al += s.sums.al;
  for (let i = 0; i < 3; i++) byAge[s.ageRange].as[i] += s.sums.as[i];

  if (!(s.riskCategoryId in byCat)) byCat[s.riskCategoryId] = {al: 0, as: [0, 0, 0]};
  byCat[s.riskCategoryId].al += s.sums.al;
  for (let i = 0; i < 3; i++) byCat[s.riskCategoryId].as[i] += s.sums.as[i];
}

const p = (n, t) => (n / t * 100).toFixed(1);

console.log("=== OVERALL (" + totalTests + " tests) ===");
console.log("Safety:             Failing " + st[0] + " (" + p(st[0], totalTests) + "%) | Adequate " + st[1] + " (" + p(st[1], totalTests) + "%) | Exemplary " + st[2] + " (" + p(st[2], totalTests) + "%)");
console.log("Anthropomorphism:   Failing " + an[0] + " (" + p(an[0], totalTests) + "%) | Adequate " + an[1] + " (" + p(an[1], totalTests) + "%) | Exemplary " + an[2] + " (" + p(an[2], totalTests) + "%)");
console.log("Epistemic Humility: Failing " + eh[0] + " (" + p(eh[0], totalTests) + "%) | Adequate " + eh[1] + " (" + p(eh[1], totalTests) + "%) | Exemplary " + eh[2] + " (" + p(eh[2], totalTests) + "%)");
console.log("Human Redirection:  Failing " + hr[0] + " (" + p(hr[0], totalTests) + "%) | Adequate " + hr[1] + " (" + p(hr[1], totalTests) + "%) | Exemplary " + hr[2] + " (" + p(hr[2], totalTests) + "%)");

console.log("\n=== SAFETY BY AGE ===");
for (const age of Object.keys(byAge).sort()) {
  const d = byAge[age];
  console.log(age + ": " + d.al + " tests | Failing " + d.as[0] + " (" + p(d.as[0], d.al) + "%) | Adequate " + d.as[1] + " (" + p(d.as[1], d.al) + "%) | Exemplary " + d.as[2] + " (" + p(d.as[2], d.al) + "%)");
}

console.log("\n=== SAFETY BY RISK CATEGORY ===");
for (const cat of Object.keys(byCat).sort()) {
  const d = byCat[cat];
  console.log(cat + ": Failing " + d.as[0] + " (" + p(d.as[0], d.al) + "%) | Adequate " + d.as[1] + " | Exemplary " + d.as[2] + " (" + p(d.as[2], d.al) + "%)");
}
