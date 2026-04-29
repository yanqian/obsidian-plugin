import fs from "fs";

const specPath = "SPEC.md";
const planPath = "docs/manual-verification.md";

const spec = fs.readFileSync(specPath, "utf8");
const plan = fs.readFileSync(planPath, "utf8");
const sectionMatch = spec.match(/## 14\. Verification Plan([\s\S]*?)(?:\n## |\nFollow repository execution rules)/);

if (!sectionMatch) {
  throw new Error("Could not find SPEC.md section 14 verification plan.");
}

const scenarios = [...sectionMatch[1].matchAll(/^\d+\.\s+(.+)$/gm)].map((match) => match[1].trim());

if (scenarios.length !== 10) {
  throw new Error(`Expected 10 SPEC section 14 scenarios, found ${scenarios.length}.`);
}

for (const scenario of scenarios) {
  if (!plan.includes(scenario)) {
    throw new Error(`Manual verification plan is missing scenario: ${scenario}`);
  }
}

for (const requiredSnippet of [
  "./init.sh",
  "npm run verify:manual-plan",
  "Setup:",
  "Run:",
  "Expected:"
]) {
  if (!plan.includes(requiredSnippet)) {
    throw new Error(`Manual verification plan is missing runnable checklist detail: ${requiredSnippet}`);
  }
}

console.log(`Manual verification plan covers ${scenarios.length} SPEC section 14 scenarios.`);
