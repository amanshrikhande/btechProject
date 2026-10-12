/**
 * Minimal local test for the ai_runner.js fix.
 * Verifies structural correctness without making real LLM or API calls.
 * Run with: node test/research_benchmark/test_ai_runner_fix.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerSource = fs.readFileSync(
  path.join(__dirname, "runners", "ai_runner.js"),
  "utf8"
);

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

console.log("\n── ai_runner.js structural fix verification ──\n");

// 1. RAG branch must NOT inject retrieved text as active_code
assert(
  "RAG branch does not inject active_code blob",
  !runnerSource.includes("active_code: contextText")
);

// 2. RAG branch must pass condition: "RAG" explicitly
assert(
  'RAG branch passes condition: "RAG"',
  runnerSource.includes('condition: "RAG"')
);

// 3. RAG branch must pass project_id in the chat call
assert(
  "RAG branch passes project_id in chat call",
  runnerSource.includes("project_id: projectId")
);

// 4. Retrieval-quality step is preserved (hit@K, MRR still computed)
assert(
  "Retrieval quality metrics step is preserved (hit1/hit3/hit5)",
  runnerSource.includes("if (firstRelevantRank === 1) hit1 = 1")
);

// 5. model field reads from response, not hardcoded
assert(
  "model field reads from response, not hardcoded string",
  !runnerSource.includes('"qwen2.5-coder:1.5b"') &&
    runnerSource.includes("chatRes.data.model")
);

// 6. GENERIC branch is unchanged (no condition field, no project_id)
// The GENERIC block should NOT contain condition: "RAG"
const genericBlock = runnerSource.split("} else {")[1] || "";
assert(
  'GENERIC branch does not pass condition: "RAG"',
  !genericBlock.slice(0, 600).includes('condition: "RAG"')
);

// 7. RAG-PATH log line exists for pipeline verification
assert(
  "[RAG-PATH] assertion log line is present",
  runnerSource.includes("[RAG-PATH]")
);

// 8. model line is not hardcoded in aiRunRow
assert(
  "aiRunRow uses actualModel variable, not a literal string",
  runnerSource.includes("model: actualModel") &&
    !runnerSource.includes('model: "qwen2.5-coder:1.5b"')
);

// ── run_research_benchmark.js checks ──────────────────────────────────────
const masterSource = fs.readFileSync(
  path.join(__dirname, "run_research_benchmark.js"),
  "utf8"
);

console.log("\n── run_research_benchmark.js structural fix verification ──\n");

// 9. main.py is in the filesToCreate list
assert(
  "main.py is included in filesToCreate for RAG indexing",
  masterSource.includes('"main.py"') &&
    masterSource.includes("chromadb") &&
    masterSource.includes("PersistentClient")
);

// 10. --ai-questions flag is parsed
assert(
  "--ai-questions CLI flag is supported",
  masterSource.includes("--ai-questions")
);

// 11. aiQuestionLimit slices BENCHMARK_QUESTIONS for pilot runs
assert(
  "aiQuestionLimit slices questions when > 0",
  masterSource.includes("aiQuestionLimit > 0") &&
    masterSource.includes("BENCHMARK_QUESTIONS.slice(0, aiQuestionLimit)")
);

// 12. Original raw result files are written to the same paths (no rename)
assert(
  "Raw result files still written to ai_runs.csv and ai_evaluations.csv",
  masterSource.includes("ai_runs.csv") &&
    masterSource.includes("ai_evaluations.csv")
);

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
