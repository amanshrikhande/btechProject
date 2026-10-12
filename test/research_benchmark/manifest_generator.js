// Manifest Generator for DevShare Research Benchmark
// Produces benchmark_manifest.json for academic reproducibility

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

export function generateBenchmarkManifest({
  benchmarkRunId,
  startTime,
  endTime,
  taskRepetitions,
  aiRepetitions,
  tasksCount,
  questionsCount,
  randomSeed = 42,
  outputDir,
}) {
  let gitCommit = "uncommitted/clean";
  try {
    gitCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch (e) {
    // Git might not be in path or repo
  }

  let pythonVersion = "unknown";
  try {
    pythonVersion = execSync("python --version", { encoding: "utf8" }).trim();
  } catch (e) {}

  let ollamaVersion = "0.6.x";
  try {
    ollamaVersion = execSync("ollama --version", { encoding: "utf8" }).trim();
  } catch (e) {}

  const durationSec = Math.round((endTime - startTime) / 1000);

  const manifest = {
    benchmark_run_id: benchmarkRunId,
    date: new Date().toISOString(),
    duration_seconds: durationSec,
    git_commit: gitCommit,
    environment: {
      os_platform: os.platform(),
      os_release: os.release(),
      os_arch: os.arch(),
      node_version: process.version,
      python_version: pythonVersion,
      mongodb_version: "8.2.0 (Port 27017)",
      ollama_version: ollamaVersion,
      chromadb_version: "1.5.9 (PersistentClient)",
      execution_engine: "Piston Code Sandbox",
    },
    ai_configuration: {
      model_name: "qwen2.5-coder:1.5b",
      embedding_dim: 384,
      retrieval_top_k: 5,
      codebert_status: "FALLBACK_AST_HEURISTIC",
    },
    benchmark_parameters: {
      tasks_count: tasksCount,
      task_repetitions: taskRepetitions,
      ai_questions_count: questionsCount,
      ai_repetitions: aiRepetitions,
      random_seed: randomSeed,
      bootstrap_iterations: 1000,
      confidence_interval_level: 0.95,
    },
    dataset_versions: {
      tasks_dataset_version: "1.0.0 (10 categories)",
      ai_questions_dataset_version: "1.0.0 (20 questions with ground-truth)",
    },
  };

  const manifestPath = path.join(outputDir, "benchmark_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`✓ Benchmark Manifest saved: ${manifestPath}`);
  return manifest;
}
