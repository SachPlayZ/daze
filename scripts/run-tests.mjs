#!/usr/bin/env node
// Runs every tests/**/*.spec.ts as an independent tsx process. Each spec is a plain
// node:assert script that throws (non-zero exit) on failure — no test framework needed.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptDir, "..");
const testsDir = path.join(root, "tests");

function collectSpecs(dir) {
  const entries = readdirSync(dir).sort();
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return collectSpecs(full);
    return entry.endsWith(".spec.ts") ? [full] : [];
  });
}

const specs = collectSpecs(testsDir);
if (!specs.length) {
  console.error("No test specs found under tests/.");
  process.exit(1);
}

let failures = 0;
for (const spec of specs) {
  const relative = path.relative(root, spec);
  const result = spawnSync(process.execPath, ["--import", "tsx", spec], { cwd: root, stdio: "pipe", encoding: "utf8" });
  if (result.status === 0) {
    console.log(`ok   ${relative}`);
  } else {
    failures += 1;
    console.log(`FAIL ${relative}`);
    console.log((result.stderr || result.stdout || "").split("\n").slice(0, 20).map((line) => `       ${line}`).join("\n"));
  }
}

console.log(`\n${specs.length - failures}/${specs.length} specs passed.`);
process.exit(failures ? 1 : 0);
