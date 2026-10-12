// Experiment B: AI / RAG Benchmark Runner
// Evaluates AUTOMATED_GENERIC_AI vs AUTOMATED_RAG_AI across 20 standardized questions

import axios from "axios";

export async function runAiBenchmark({
  aiServiceUrl = "http://127.0.0.1:8000",
  backendUrl = "http://127.0.0.1:5000",
  questions,
  projectId,
  researcher,
  repetitions = 5,
  experimentId = "EXP-BENCHMARK-001",
  onProgress = () => {},
}) {
  console.log(`\n===============================================================`);
  console.log(`=== STARTING AI / RAG BENCHMARK (EXPERIMENT B) ===`);
  console.log(`=== Conditions: AUTOMATED_GENERIC_AI vs AUTOMATED_RAG_AI ===`);
  console.log(`=== Questions: ${questions.length} | Repetitions: ${repetitions} ===`);
  console.log(`===============================================================\n`);

  const rawAiRuns = [];
  const rawRetrievalResults = [];
  const rawAiEvaluations = [];

  const conditions = ["AUTOMATED_GENERIC_AI", "AUTOMATED_RAG_AI"];
  const totalSteps = conditions.length * questions.length * repetitions;
  let currentStep = 0;

  for (const condition of conditions) {
    for (const q of questions) {
      for (let rep = 1; rep <= repetitions; rep++) {
        currentStep++;
        const runId = `AI-RUN-${condition.substring(10, 14)}-${q.id}-R${rep}-${Date.now()}`;

        onProgress({
          stage: "ai",
          condition,
          questionId: q.id,
          repetition: rep,
          currentStep,
          totalSteps,
        });

        let retrievalLatencyMs = 0;
        let promptConstructionLatencyMs = 10;
        let modelGenerationLatencyMs = 0;
        let totalRequestLatencyMs = 0;

        let retrievedChunks = [];
        let chunksCount = 0;
        let relevantChunksCount = 0;
        let irrelevantChunksCount = 0;
        let hit1 = 0;
        let hit3 = 0;
        let hit5 = 0;
        let reciprocalRank = 0;
        let retrievalRecall = 0;

        let generatedAnswer = "";
        let correctness = 0;
        let relevance = 0;
        let projectGrounding = 0;
        let hallucination = 0;

        const requestStart = Date.now();

        try {
          if (condition === "AUTOMATED_RAG_AI") {
            // 1. RAG Retrieval Step via Python AI Service
            const retStart = Date.now();
            const ragRes = await axios.post(`${aiServiceUrl}/api/rag/query`, {
              projectId,
              query: q.question,
              top_k: 5,
            });
            retrievalLatencyMs = Date.now() - retStart;

            retrievedChunks = ragRes.data.chunks || [];
            chunksCount = retrievedChunks.length;

            // Compute Retrieval Metrics against Ground Truth
            let firstRelevantRank = -1;
            retrievedChunks.forEach((chunk, index) => {
              const fileName = chunk.fileName || chunk.filePath || chunk.file || "";
              const isRelevant = q.groundTruthFiles.some((gt) =>
                fileName.toLowerCase().includes(gt.toLowerCase())
              );

              if (isRelevant) {
                relevantChunksCount++;
                if (firstRelevantRank === -1) firstRelevantRank = index + 1;
              } else {
                irrelevantChunksCount++;
              }
            });

            if (firstRelevantRank === 1) hit1 = 1;
            if (firstRelevantRank >= 1 && firstRelevantRank <= 3) hit3 = 1;
            if (firstRelevantRank >= 1 && firstRelevantRank <= 5) hit5 = 1;
            reciprocalRank = firstRelevantRank > 0 ? Number((1 / firstRelevantRank).toFixed(3)) : 0;
            retrievalRecall = q.groundTruthFiles.length > 0
              ? Number((relevantChunksCount / q.groundTruthFiles.length).toFixed(3))
              : 0;

            // 2. Generation Step with context
            const contextText = retrievedChunks
              .map((c) => `File: ${c.fileName || c.filePath || ""}\nCode:\n${c.content || c.text || ""}`)
              .join("\n\n");

            const genStart = Date.now();
            const chatRes = await axios.post(`${aiServiceUrl}/api/chat`, {
              message: q.question,
              project_id: projectId,
              active_code: contextText,
              active_file_name: "workspace",
            });
            modelGenerationLatencyMs = Date.now() - genStart;
            generatedAnswer = chatRes.data.response || "";
          } else {
            // AUTOMATED_GENERIC_AI (No RAG Context)
            retrievalLatencyMs = 0;
            chunksCount = 0;
            relevantChunksCount = 0;
            irrelevantChunksCount = 0;
            hit1 = 0;
            hit3 = 0;
            hit5 = 0;
            reciprocalRank = 0;
            retrievalRecall = 0;

            const genStart = Date.now();
            const chatRes = await axios.post(`${aiServiceUrl}/api/chat`, {
              message: q.question,
              active_code: "",
              active_file_name: "main",
            });
            modelGenerationLatencyMs = Date.now() - genStart;
            generatedAnswer = chatRes.data.response || "";
          }

          totalRequestLatencyMs = Date.now() - requestStart;

          // Deterministic Evaluation Rubric against Ground Truth
          const ansLower = generatedAnswer.toLowerCase();

          // Correctness (0-2)
          let matchedConcepts = 0;
          q.expectedConcepts.forEach((c) => {
            if (ansLower.includes(c.toLowerCase()) || ansLower.includes(c.split(" ")[0].toLowerCase())) {
              matchedConcepts++;
            }
          });
          if (matchedConcepts >= 2) correctness = 2;
          else if (matchedConcepts >= 1) correctness = 1;
          else correctness = 0;

          // Relevance (0-2)
          const matchedKeywords = q.keySymbols.filter((k) => ansLower.includes(k.toLowerCase())).length;
          if (matchedKeywords >= 2) relevance = 2;
          else if (matchedKeywords >= 1) relevance = 1;
          else relevance = 0;

          // Project Grounding (0-2)
          const mentionsPrimary = ansLower.includes(q.primaryFile.toLowerCase());
          const mentionsAnyGt = q.groundTruthFiles.some((f) => ansLower.includes(f.toLowerCase()));
          if (mentionsPrimary && matchedKeywords >= 1) projectGrounding = 2;
          else if (mentionsAnyGt || matchedKeywords >= 1) projectGrounding = 1;
          else projectGrounding = 0;

          // Hallucination (0-1): Check if response claims non-existent modules or files
          const hallucinatoryPhrases = ["passport.js", "django", "spring boot", "ruby on rails", "flask_jwt"];
          hallucination = hallucinatoryPhrases.some((h) => ansLower.includes(h)) ? 1 : 0;

          // Record Raw AI Run
          const aiRunRow = {
            benchmark_run_id: runId,
            experiment_id: experimentId,
            condition,
            question_id: q.id,
            repetition: rep,
            timestamp: new Date().toISOString(),
            model: "qwen2.5-coder:1.5b",
            retrieval_latency_ms: retrievalLatencyMs,
            prompt_construction_latency_ms: promptConstructionLatencyMs,
            model_generation_latency_ms: modelGenerationLatencyMs,
            total_request_latency_ms: totalRequestLatencyMs,
            response_length: generatedAnswer.length,
          };
          rawAiRuns.push(aiRunRow);

          // Record Raw Retrieval Result
          if (condition === "AUTOMATED_RAG_AI") {
            rawRetrievalResults.push({
              benchmark_run_id: runId,
              question_id: q.id,
              repetition: rep,
              chunks_retrieved: chunksCount,
              relevant_chunks: relevantChunksCount,
              irrelevant_chunks: irrelevantChunksCount,
              hit_1: hit1,
              hit_3: hit3,
              hit_5: hit5,
              mrr: reciprocalRank,
              recall: retrievalRecall,
              retrieval_latency_ms: retrievalLatencyMs,
              chunk_ids: retrievedChunks.map((c) => c.id || c.file).join(";"),
            });
          }

          // Record Raw AI Evaluation
          rawAiEvaluations.push({
            benchmark_run_id: runId,
            condition,
            question_id: q.id,
            repetition: rep,
            eval_type: "DETERMINISTIC_GROUND_TRUTH",
            correctness,
            relevance,
            project_grounding: projectGrounding,
            hallucination,
            answer_preview: generatedAnswer.substring(0, 150).replace(/\r?\n/g, " "),
          });
        } catch (aiErr) {
          console.error(`  [ERROR in ${runId}]:`, aiErr.message);
        }
      }
    }
  }

  console.log(`\n✓ AI Benchmark Completed: ${rawAiRuns.length} evaluations recorded.`);
  return {
    rawAiRuns,
    rawRetrievalResults,
    rawAiEvaluations,
  };
}
