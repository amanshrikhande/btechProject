import axios from "axios";
import io from "../../frontend/node_modules/socket.io-client/build/esm/index.js";
import mongoose from "mongoose";

const SERVER_URL = "http://localhost:5000";
const AI_SERVICE_URL = "http://127.0.0.1:8000";

const AUTH_TEST_SUITE_CODE = `
// 10 AUTOMATED TEST CASES FOR AUTHENTICATION
const testResults = [];
function runTest(name, fn) {
  try {
    const pass = fn();
    testResults.push({ name, status: pass ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

runTest("TEST 1: Valid login", () => typeof validateCredentials === "function" && validateCredentials("user@test.dev", "Password123!").valid === true);
runTest("TEST 2: Invalid password", () => typeof validateCredentials === "function" && validateCredentials("user@test.dev", "short").valid === false);
runTest("TEST 3: Nonexistent user", () => typeof validateCredentials === "function" && validateCredentials("", "Password123!").valid === false);
runTest("TEST 4: Protected endpoint", () => typeof generateAuthToken === "function" && generateAuthToken({ id: 1 }).startsWith("jwt_token_"));
runTest("TEST 5: Invalid token format", () => typeof verifyToken === "function" && verifyToken("bad_token").valid === false);
runTest("TEST 6: Valid token extraction", () => typeof verifyToken === "function" && verifyToken(generateAuthToken({ id: 42 })).user?.id === 42);
runTest("TEST 7: Registration input validation", () => typeof validateCredentials === "function" && validateCredentials("new@dev.com", "SecurePass999").valid === true);
runTest("TEST 8: Null password handling", () => typeof validateCredentials === "function" && validateCredentials("dup@dev.com", null).valid === false);
runTest("TEST 9: Invalid input types", () => typeof validateCredentials === "function" && validateCredentials(null, null).valid === false);
runTest("TEST 10: Special char requirement", () => {
  // Strict test: deliberate fail if no special char checker
  return false;
});

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;

console.log(JSON.stringify({
  total: testResults.length,
  passed,
  failed,
  successRate: passed / testResults.length,
  details: testResults
}));
`;

const CANDIDATE_CODE = `
function validateCredentials(email, password) {
  if (!email || !password) return { valid: false, error: "Missing required credentials" };
  if (password.length < 8) return { valid: false, error: "Password must be at least 8 chars" };
  return { valid: true, user: { id: "user_test_99", email, active: true } };
}

function generateAuthToken(user) {
  return "jwt_token_" + Buffer.from(JSON.stringify(user)).toString("base64");
}

function verifyToken(token) {
  if (!token || !token.startsWith("jwt_token_")) return { valid: false, error: "Invalid token" };
  try {
    const raw = Buffer.from(token.replace("jwt_token_", ""), "base64").toString("utf-8");
    return { valid: true, user: JSON.parse(raw) };
  } catch (e) {
    return { valid: false, error: "Malformed payload" };
  }
}
`;

export async function runBlockerValidationTests() {
  console.log("\n=======================================================");
  console.log("=== EXECUTING COMPREHENSIVE BLOCKER VALIDATION SUITE ===");
  console.log("=======================================================\n");

  const results = {};

  // Setup test accounts
  const { setupTestEnvironment } = await import("./test_env_setup.js");
  const { authResults, testProject } = await setupTestEnvironment();

  const researcher = authResults["researcher@test.dev"];
  const p1 = authResults["participant1@test.dev"];
  const p2 = authResults["participant2@test.dev"];
  const projectId = testProject?._id || testProject?.id;

  // -----------------------------------------------------------------
  // BLOCKER 1: RESEARCH TASK SYSTEM & AUTOMATED EVALUATION
  // -----------------------------------------------------------------
  console.log("\n--- [BLOCKER 1] Research Task System & Automated Evaluation ---");
  try {
    // 1. Create Research Task
    const taskRes = await axios.post(
      `${SERVER_URL}/api/tasks`,
      {
        experimentId: "EXP-PILOT-001",
        taskId: "TASK-AUTH-01",
        title: "Fix Authentication & Token Validation",
        description: "Implement robust credential validation and JWT token extraction routines.",
        difficulty: "MEDIUM",
        timeLimitMinutes: 2,
        testSuite: {
          language: "javascript",
          testCode: AUTH_TEST_SUITE_CODE,
          expectedTotal: 10,
        },
        starterCode: "// Implement validateCredentials and verifyToken",
      },
      { headers: { Authorization: `Bearer ${researcher.token}` } }
    );
    console.log("  ✓ Task created:", taskRes.data.data.taskId, `("${taskRes.data.data.title}")`);

    // 2. Participant starts task session
    const startRes = await axios.post(
      `${SERVER_URL}/api/tasks/TASK-AUTH-01/start`,
      {
        experimentId: "EXP-PILOT-001",
        sessionId: "SESSION-TASK-001",
        condition: "CONTROLLED",
      },
      { headers: { Authorization: `Bearer ${p1.token}` } }
    );
    console.log("  ✓ Task session started:", {
      status: startRes.data.data.completionStatus,
      startedAt: startRes.data.data.startedAt,
      expiresAt: startRes.data.data.expiresAt,
      remainingSeconds: startRes.data.remainingSeconds,
    });

    // 3. Reconnect test: calling start again should return existing session
    const reconnRes = await axios.post(
      `${SERVER_URL}/api/tasks/TASK-AUTH-01/start`,
      { experimentId: "EXP-PILOT-001", sessionId: "SESSION-TASK-001" },
      { headers: { Authorization: `Bearer ${p1.token}` } }
    );
    console.log("  ✓ Participant reconnection handled gracefully. Reconnected:", reconnRes.data.reconnected === true);

    // 4. Submit task solution before expiration
    const submitRes = await axios.post(
      `${SERVER_URL}/api/tasks/TASK-AUTH-01/submit`,
      { submissionCode: CANDIDATE_CODE },
      { headers: { Authorization: `Bearer ${p1.token}` } }
    );

    const summary = submitRes.data.summary;
    console.log("  ✓ Task submitted and auto-evaluated:", {
      completionStatus: summary.completionStatus,
      testsTotal: summary.testsTotal,
      testsPassed: summary.testsPassed,
      testsFailed: summary.testsFailed,
      testSuccessRate: `${(summary.testSuccessRate * 100).toFixed(1)}%`,
      completionTimeSeconds: summary.completionTimeSeconds,
    });

    // 5. Server-side expiration test
    // Create a task with 0 minutes time limit (already expired)
    await axios.post(
      `${SERVER_URL}/api/tasks`,
      {
        experimentId: "EXP-PILOT-001",
        taskId: "TASK-EXPIRED-TEST",
        title: "Immediate Expiry Task",
        description: "Validates server-side expiration handling",
        difficulty: "EASY",
        timeLimitMinutes: -1, // Already in past
        testSuite: { language: "javascript", testCode: AUTH_TEST_SUITE_CODE, expectedTotal: 10 },
      },
      { headers: { Authorization: `Bearer ${researcher.token}` } }
    );

    await axios.post(
      `${SERVER_URL}/api/tasks/TASK-EXPIRED-TEST/start`,
      { experimentId: "EXP-PILOT-001", sessionId: "SESSION-EXPIRY-001" },
      { headers: { Authorization: `Bearer ${p2.token}` } }
    );

    const expiredSubmit = await axios.post(
      `${SERVER_URL}/api/tasks/TASK-EXPIRED-TEST/submit`,
      { submissionCode: CANDIDATE_CODE },
      { headers: { Authorization: `Bearer ${p2.token}` } }
    );
    console.log("  ✓ Server-side expiration enforcement verified! Status:", expiredSubmit.data.data.completionStatus);

    results.blocker1_tasks = {
      passed: summary.testsPassed === 9 && summary.testsFailed === 1 && expiredSubmit.data.data.completionStatus === "TIME_EXPIRED",
      details: {
        taskCreated: true,
        testsPassed: summary.testsPassed,
        testsFailed: summary.testsFailed,
        successRate: summary.testSuccessRate,
        completionTimeSeconds: summary.completionTimeSeconds,
        expirationEnforced: expiredSubmit.data.data.completionStatus === "TIME_EXPIRED",
      },
    };
  } catch (err) {
    console.error("  ✗ Blocker 1 Failed:", err.response?.data || err.message);
    results.blocker1_tasks = { passed: false, error: err.message };
  }

  // -----------------------------------------------------------------
  // BLOCKER 2 & 3: QUESTIONNAIRE SYSTEM & NASA-TLX
  // -----------------------------------------------------------------
  console.log("\n--- [BLOCKER 2 & 3] Questionnaire System & NASA-TLX ---");
  try {
    const RUN_SESSION_ID = `SESSION-TASK-${Date.now()}`;

    // 1. Fetch Collaboration Questionnaire schema
    const collabQRes = await axios.get(`${SERVER_URL}/api/questionnaires/POST_COLLABORATION`, {
      headers: { Authorization: `Bearer ${p1.token}` },
    });
    console.log("  ✓ Fetched Collaboration Questionnaire:", collabQRes.data.data.questions.length, "questions");

    // 2. Submit Collaboration responses (1–5 Likert)
    const collabSubmitRes = await axios.post(
      `${SERVER_URL}/api/questionnaires/response`,
      {
        experimentId: "EXP-PILOT-001",
        sessionId: RUN_SESSION_ID,
        condition: "CONTROLLED",
        taskId: "TASK-AUTH-01",
        questionnaireId: "POST_COLLABORATION",
        responses: [
          { questionId: "collab_q1", score: 4 },
          { questionId: "collab_q2", score: 5 },
          { questionId: "collab_q3", score: 4 },
          { questionId: "collab_q4", score: 5 },
          { questionId: "collab_q5", score: 2 },
          { questionId: "collab_q6", score: 4 },
          { questionId: "collab_q7", score: 5 },
          { questionId: "collab_q8", score: 5 },
        ],
      },
      { headers: { Authorization: `Bearer ${p1.token}` } }
    );
    console.log("  ✓ Submitted Collaboration responses:", collabSubmitRes.data.message);

    // 3. Test Immutability: Attempt duplicate modification -> MUST reject with 409
    let duplicateBlocked = false;
    try {
      await axios.post(
        `${SERVER_URL}/api/questionnaires/response`,
        {
          experimentId: "EXP-PILOT-001",
          sessionId: RUN_SESSION_ID,
          condition: "CONTROLLED",
          questionnaireId: "POST_COLLABORATION",
          responses: [{ questionId: "collab_q1", score: 1 }],
        },
        { headers: { Authorization: `Bearer ${p1.token}` } }
      );
    } catch (dupErr) {
      if (dupErr.response?.status === 409) {
        duplicateBlocked = true;
        console.log("  ✓ IMMUTABILITY VERIFIED: Modification attempt rejected with HTTP 409:", dupErr.response?.data?.error);
      }
    }

    // 4. Submit NASA-TLX 6 raw dimensions
    const nasaSubmitRes = await axios.post(
      `${SERVER_URL}/api/questionnaires/response`,
      {
        experimentId: "EXP-PILOT-001",
        sessionId: RUN_SESSION_ID,
        condition: "CONTROLLED",
        taskId: "TASK-AUTH-01",
        questionnaireId: "NASA_TLX",
        rawNasaTlx: {
          mentalDemand: 45,
          physicalDemand: 10,
          temporalDemand: 55,
          performance: 85,
          effort: 50,
          frustration: 20,
        },
      },
      { headers: { Authorization: `Bearer ${p1.token}` } }
    );
    console.log("  ✓ Submitted NASA-TLX raw dimensions:", nasaSubmitRes.data.data.rawNasaTlx);

    results.blocker2_3_questionnaires = {
      passed: collabSubmitRes.status === 201 && duplicateBlocked && !!nasaSubmitRes.data.data.rawNasaTlx,
      details: {
        collabQuestionsCount: collabQRes.data.data.questions.length,
        collabSubmissionSaved: true,
        immutabilityEnforced: duplicateBlocked,
        nasaTlxRawSaved: nasaSubmitRes.data.data.rawNasaTlx,
      },
    };
  } catch (err) {
    console.error("  ✗ Blocker 2/3 Failed:", err.response?.data || err.message);
    results.blocker2_3_questionnaires = { passed: false, error: err.message };
  }

  // -----------------------------------------------------------------
  // BLOCKER 4: BULK RESEARCH DATA EXPORT
  // -----------------------------------------------------------------
  console.log("\n--- [BLOCKER 4] Researcher Bulk Export System ---");
  try {
    // 1. Authorized Researcher export (CSV format)
    const exportCsvRes = await axios.get(
      `${SERVER_URL}/api/analytics/export?format=csv`,
      { headers: { Authorization: `Bearer ${researcher.token}` } }
    );

    const isCsv = exportCsvRes.headers["content-type"]?.includes("text/csv");
    const csvContent = exportCsvRes.data;
    const hasHeader = csvContent.includes("participant_id") && csvContent.includes("completion_time");

    console.log(`  ✓ Researcher CSV export generated (${csvContent.split("\n").length} lines). Content-Type: ${exportCsvRes.headers["content-type"]}`);
    console.log("  ✓ Verified presence of research metrics in CSV header:", hasHeader);

    // 2. Authorized Researcher export (JSON format)
    const exportJsonRes = await axios.get(
      `${SERVER_URL}/api/analytics/export?format=json`,
      { headers: { Authorization: `Bearer ${researcher.token}` } }
    );
    console.log(`  ✓ Researcher JSON export returned ${exportJsonRes.data.totalSessions} sessions.`);

    // 3. Security: Participant attempts export -> MUST be rejected with HTTP 403
    let participantBlocked = false;
    try {
      await axios.get(
        `${SERVER_URL}/api/analytics/export?format=csv`,
        { headers: { Authorization: `Bearer ${p1.token}` } }
      );
    } catch (pErr) {
      if (pErr.response?.status === 403) {
        participantBlocked = true;
        console.log("  ✓ SECURITY VERIFIED: Normal participant export blocked with HTTP 403 Forbidden:", pErr.response?.data?.error);
      }
    }

    results.blocker4_export = {
      passed: isCsv && hasHeader && exportJsonRes.data.success && participantBlocked,
      details: {
        csvExportValid: isCsv && hasHeader,
        jsonSessionsCount: exportJsonRes.data.totalSessions,
        unauthorizedAccessBlocked: participantBlocked,
      },
    };
  } catch (err) {
    console.error("  ✗ Blocker 4 Failed:", err.response?.data || err.message);
    results.blocker4_export = { passed: false, error: err.message };
  }

  // -----------------------------------------------------------------
  // BLOCKER 5: FIX LEADER ASSIGNMENT SECURITY
  // -----------------------------------------------------------------
  console.log("\n--- [BLOCKER 5] Leader Assignment Security Fix ---");
  const testSecureRoom = `SECURE-LEADER-ROOM-${Date.now()}`;
  const socketP2 = io(SERVER_URL, { transports: ["websocket"] });
  const socketResearcher = io(SERVER_URL, { transports: ["websocket"] });

  try {
    await Promise.all([
      new Promise((res) => socketP2.on("connect", res)),
      new Promise((res) => socketResearcher.on("connect", res)),
    ]);

    // Test: Participant 2 joins an empty room first
    const p2SyncPromise = new Promise((resolve) => {
      socketP2.once("roomStateSync", (data) => resolve(data));
    });

    socketP2.emit("join", {
      roomId: testSecureRoom,
      userName: "Participant 2",
      userId: p2.user.id || p2.user._id,
      projectId,
    });

    const p2Sync = await p2SyncPromise;
    console.log("  Participant 2 joins empty room first. Assigned role:", p2Sync.myRole, "leaderSocketId:", p2Sync.leaderSocketId);

    const p2NotLeader = p2Sync.myRole !== "LEADER" && p2Sync.leaderSocketId !== socketP2.id;
    console.log("  ✓ Participant 2 is NOT assigned Leader:", p2NotLeader ? "YES" : "NO");

    // Participant 2 attempts to toggle Leader Mode
    const p2DeniedLeaderMode = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for permissionDenied on setLeaderMode")), 2000);
      socketP2.once("permissionDenied", (d) => {
        clearTimeout(timer);
        resolve(d);
      });
    });

    socketP2.emit("setLeaderMode", { roomId: testSecureRoom, enabled: true });
    const denial = await p2DeniedLeaderMode;
    console.log("  ✓ Participant 2 cannot toggle Leader Mode:", denial.message);

    // Researcher joins the room
    const researcherSyncPromise = new Promise((resolve) => {
      socketResearcher.once("roomStateSync", (data) => resolve(data));
    });

    socketResearcher.emit("join", {
      roomId: testSecureRoom,
      userName: "Researcher Admin",
      userId: researcher.user.id || researcher.user._id,
      projectId,
    });

    const resSync = await researcherSyncPromise;
    console.log("  Researcher joins room. Assigned role:", resSync.myRole, "leaderSocketId:", resSync.leaderSocketId);

    const researcherIsLeader = resSync.myRole === "LEADER" && resSync.leaderSocketId === socketResearcher.id;
    console.log("  ✓ Researcher is assigned Leader:", researcherIsLeader ? "YES" : "NO");

    socketP2.disconnect();
    socketResearcher.disconnect();

    results.blocker5_leadership = {
      passed: p2NotLeader && !!denial && researcherIsLeader,
      details: {
        participantTakeoverPrevented: p2NotLeader,
        unauthorizedLeaderActionBlocked: true,
        researcherElectedLeader: researcherIsLeader,
      },
    };
  } catch (err) {
    console.error("  ✗ Blocker 5 Failed:", err.message);
    results.blocker5_leadership = { passed: false, error: err.message };
  }

  // -----------------------------------------------------------------
  // BLOCKER 6: REAL AI / RAG VALIDATION
  // -----------------------------------------------------------------
  console.log("\n--- [BLOCKER 6] Real AI & ChromaDB Vector Store Validation ---");
  try {
    // 1. Health check: verify ChromaDB and Ollama status
    const aiHealth = await axios.get(`${AI_SERVICE_URL}/api/health`);
    console.log("  ✓ AI Service Health Status:", {
      status: aiHealth.data.status,
      ollamaOnline: aiHealth.data.ollama?.online,
      ollamaModels: aiHealth.data.ollama?.models,
      chromadbOnline: aiHealth.data.chromadb?.online,
      chromadbEngine: aiHealth.data.chromadb?.engine,
    });

    // 2. Index project files into real ChromaDB collection
    const ragIndexRes = await axios.post(`${SERVER_URL}/api/ai/rag/index`, {
      projectId,
    });
    console.log("  ✓ Real ChromaDB Indexing:", ragIndexRes.data);

    // 3. Query ChromaDB directly
    const ragQueryRes = await axios.post(`${SERVER_URL}/api/ai/rag/query`, {
      projectId,
      query: "Where is authentication implemented?",
      topK: 2,
    });
    const chunks = ragQueryRes.data?.data?.chunks || ragQueryRes.data?.chunks || [];
    console.log(`  ✓ ChromaDB Query returned ${chunks.length} chunks. Source: ${chunks[0]?.source || "vectorstore"}`);
    if (chunks.length > 0) {
      console.log(`    Chunk 1 file: ${chunks[0].fileName}, preview: ${chunks[0].content?.slice(0, 70)}...`);
    }

    // 4. Live Chat generation via local Ollama LLM
    console.log("  -> Calling live Ollama LLM (qwen2.5-coder:1.5b)...");
    const t0 = Date.now();
    const chatRes = await axios.post(`${SERVER_URL}/api/ai/chat`, {
      message: "Explain the purpose of validateCredentials in auth.js",
      projectId,
      roomId: "REAL-AI-VALIDATION-ROOM",
      activeFileName: "auth.js",
      activeCode: CANDIDATE_CODE,
      language: "javascript",
    });
    const elapsed = Date.now() - t0;
    const responseText = chatRes.data?.data?.response || "";
    console.log(`  ✓ Real Ollama LLM generated response in ${elapsed}ms:`);
    console.log(`    Preview: "${responseText.slice(0, 150).replace(/\n/g, " ")}..."`);

    results.blocker6_real_ai = {
      passed: aiHealth.data.ollama?.online === true && aiHealth.data.chromadb?.online === true && chunks.length > 0 && responseText.length > 50,
      details: {
        ollamaOnline: aiHealth.data.ollama?.online,
        ollamaModel: "qwen2.5-coder:1.5b",
        chromadbOnline: aiHealth.data.chromadb?.online,
        chromaChunksCount: chunks.length,
        retrievedFromChroma: chunks[0]?.source === "chromadb",
        llmResponseLength: responseText.length,
        llmLatencyMs: elapsed,
        codeBertStatus: "PyTorch/CodeBERT offline (heuristic AST classifier active)",
      },
    };
  } catch (err) {
    console.error("  ✗ Blocker 6 Failed:", err.response?.data || err.message);
    results.blocker6_real_ai = { passed: false, error: err.message };
  }

  console.log("\n=======================================================");
  console.log("=== BLOCKER VALIDATION SUMMARY ===");
  console.log("=======================================================");
  console.log(JSON.stringify(results, null, 2));

  return results;
}

if (process.argv[1].endsWith("verify_blocker_fixes.js")) {
  runBlockerValidationTests()
    .then((r) => {
      const allPassed = Object.values(r).every((x) => x.passed === true);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
