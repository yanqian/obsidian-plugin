import fs from "fs";

const featureListPath = "feature_list.json";
const testPlanPath = "test_plan.md";

const featureList = JSON.parse(fs.readFileSync(featureListPath, "utf8"));
const testPlan = fs.readFileSync(testPlanPath, "utf8");

if (!Array.isArray(featureList.features)) {
  throw new Error("feature_list.json must contain a top-level features array.");
}

for (const requiredSnippet of [
  "## Completion Rules",
  "## Smoke Test Expectations",
  "## Feature Coverage",
  "passes=true",
  "npm run build",
  "npm run smoke"
]) {
  if (!testPlan.includes(requiredSnippet)) {
    throw new Error(`test_plan.md is missing required coverage detail: ${requiredSnippet}`);
  }
}

const knownFeatureIds = new Set();
for (const feature of featureList.features) {
  if (typeof feature.id !== "string" || feature.id.length === 0) {
    throw new Error("Every feature must have a non-empty string id.");
  }
  if (knownFeatureIds.has(feature.id)) {
    throw new Error(`Duplicate feature id in feature_list.json: ${feature.id}`);
  }
  knownFeatureIds.add(feature.id);
}

const coverageRows = [...testPlan.matchAll(/^\|\s*(F\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm)];
const coverageByFeature = new Map();

for (const match of coverageRows) {
  const [, id, coverageType, evidence] = match;

  if (!knownFeatureIds.has(id)) {
    throw new Error(`test_plan.md has coverage for unknown feature id: ${id}`);
  }
  if (coverageByFeature.has(id)) {
    throw new Error(`test_plan.md has duplicate coverage rows for ${id}.`);
  }
  if (!coverageType.trim() || !evidence.trim()) {
    throw new Error(`test_plan.md coverage row for ${id} must include type and evidence.`);
  }

  coverageByFeature.set(id, { coverageType: coverageType.trim(), evidence: evidence.trim() });
}

const completedFeatures = featureList.features.filter((feature) => feature.passes === true);

for (const feature of completedFeatures) {
  const coverage = coverageByFeature.get(feature.id);
  if (!coverage) {
    throw new Error(`Completed feature ${feature.id} is missing a coverage row in test_plan.md.`);
  }

  const combinedEvidence = `${coverage.coverageType} ${coverage.evidence}`;
  if (!/\b(Build|Smoke|Manual|CI|Verifier|verifier)\b/.test(combinedEvidence)) {
    throw new Error(`Coverage row for ${feature.id} must cite build, smoke, manual, CI, or verifier evidence.`);
  }
}

console.log(`Test plan covers ${completedFeatures.length} completed features.`);
