import fs from "fs";

const port = Number.parseInt(process.env.SMOKE_PORT ?? "4173", 10);
const requiredFiles = ["manifest.json", "main.ts", "main.js", "feature_list.json", "progress.md"];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const response = await fetch(`http://127.0.0.1:${port}/health`);

if (!response.ok) {
  throw new Error(`Smoke service returned ${response.status}`);
}

const body = await response.json();

if (body.ok !== true) {
  throw new Error("Smoke service health response was not ok");
}

console.log("Smoke test passed");
