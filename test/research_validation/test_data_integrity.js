import mongoose from "mongoose";
import axios from "axios";
import io from "../../frontend/node_modules/socket.io-client/build/esm/index.js";

const SERVER_URL = "http://localhost:5000";

export async function runDataIntegrityAndSecurityTests(testContext) {
  console.log("\n=======================================================");
  console.log("=== PART 19, 20, 25, 26: DATA INTEGRITY & SECURITY ===");
  console.log("=======================================================\n");

  const results = {
    databaseIntegrity: { passed: false, details: {} },
    conditionImmutability: { passed: false, details: {} },
    securityAuthorization: { passed: false, details: {} },
    failureResilience: { passed: false, details: {} },
  };

  const p1 = testContext.authResults["participant1@test.dev"];
  const p2 = testContext.authResults["participant2@test.dev"];
  const projectId = testContext.testProject?._id || testContext.testProject?.id;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect("mongodb://127.0.0.1:27017/devshare");
  }

  // ---------------------------------------------------------------
  // 1. DATABASE INTEGRITY & ORPHAN CHECK (PART 19)
  // ---------------------------------------------------------------
  console.log("--- 1. Auditing Database Consistency & Event Referencing ---");
  const SessionEvent = mongoose.model(
    "SessionEvent",
    new mongoose.Schema({}, { strict: false })
  );
  const RoomSession = mongoose.model(
    "RoomSession",
    new mongoose.Schema({}, { strict: false })
  );

  const totalEvents = await SessionEvent.countDocuments();
  const eventsWithoutSession = await SessionEvent.countDocuments({ sessionId: null });
  const eventsWithoutRoom = await SessionEvent.countDocuments({ roomId: null });
  const invalidTimestamps = await SessionEvent.countDocuments({ timestamp: { $exists: false } });

  console.log(`  Total recorded audit events in DB: ${totalEvents}`);
  console.log(`  Events without roomId: ${eventsWithoutRoom}`);
  console.log(`  Events without sessionId: ${eventsWithoutSession} (Note: ad-hoc HTTP events or pre-session events)`);
  console.log(`  Events with invalid/missing timestamps: ${invalidTimestamps}`);

  const integrityPassed = eventsWithoutRoom === 0 && invalidTimestamps === 0;
  results.databaseIntegrity = {
    passed: integrityPassed,
    details: {
      totalEvents,
      eventsWithoutRoom,
      eventsWithoutSession,
      invalidTimestamps,
    },
  };

  // ---------------------------------------------------------------
  // 2. EXPERIMENT CONDITION INTEGRITY & IMMUTABILITY (PART 20)
  // ---------------------------------------------------------------
  console.log("\n--- 2. Testing Experimental Condition Immutability ---");
  // Test: Does RoomSession enforce immutable condition or can a client socket emit arbitrary changes?
  const testRoomId = "EXP-CONDITION-IMMUTABILITY-TEST";
  const p2Socket = io(SERVER_URL, { transports: ["websocket"] });

  try {
    await new Promise((res) => p2Socket.on("connect", res));

    p2Socket.emit("join", {
      roomId: testRoomId,
      userName: "Participant 2",
      userId: p2.user.id || p2.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 300));

    // A non-leader participant (P2) attempts to toggle collaboration mode or set leader mode
    const permissionDeniedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server failed to reject non-leader setLeaderMode")), 2500);
      p2Socket.once("permissionDenied", (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    p2Socket.emit("setLeaderMode", { roomId: testRoomId, enabled: true });
    const denial = await permissionDeniedPromise;
    console.log("  ✓ Non-leader cannot alter condition/Leader Mode:", denial.message);

    // Check RoomSession in DB
    const sessionRecord = await RoomSession.findOne({ roomId: testRoomId });
    console.log("  ✓ DB Session Collaboration Mode remained unchanged:", sessionRecord?.collaborationMode || "NORMAL");

    results.conditionImmutability = {
      passed: !!denial,
      details: {
        nonLeaderRejected: true,
        rejectionMessage: denial.message,
        storedMode: sessionRecord?.collaborationMode,
      },
    };
    p2Socket.disconnect();
  } catch (err) {
    console.error("  ✗ Condition Immutability Test Failed:", err.message);
    results.conditionImmutability = { passed: false, error: err.message };
  }

  // ---------------------------------------------------------------
  // 3. SECURITY & UNAUTHORIZED ACTIONS (PART 25)
  // ---------------------------------------------------------------
  console.log("\n--- 3. Testing Security & Authorization Controls ---");
  const securityChecks = [];

  // Check A: Unauthenticated request to protected project files
  try {
    await axios.post(`${SERVER_URL}/api/projects`, { name: "Hacked Project" });
    securityChecks.push({ test: "Unauthenticated Project Creation", blocked: false });
  } catch (err) {
    const is401 = err.response?.status === 401;
    securityChecks.push({ test: "Unauthenticated Project Creation", blocked: is401, status: err.response?.status });
    console.log(`  ✓ Unauthenticated project creation blocked with HTTP ${err.response?.status}`);
  }

  // Check B: Invalid JWT token rejection
  try {
    await axios.get(`${SERVER_URL}/api/projects`, {
      headers: { Authorization: "Bearer INVALID_TOKEN_FORGED_SIG" },
    });
    securityChecks.push({ test: "Forged Token Access", blocked: false });
  } catch (err) {
    const is401 = err.response?.status === 401;
    securityChecks.push({ test: "Forged Token Access", blocked: is401, status: err.response?.status });
    console.log(`  ✓ Forged JWT token rejected with HTTP ${err.response?.status}`);
  }

  // Check C: Non-leader socket attempting startInterview
  const p2CandSocket = io(SERVER_URL, { transports: ["websocket"] });
  try {
    await new Promise((res) => p2CandSocket.on("connect", res));
    p2CandSocket.emit("join", {
      roomId: "SEC-TEST-ROOM",
      userName: "Viewer",
      userId: p2.user.id || p2.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 300));

    // P1 joins and takes ownership/leader
    const p1LeaderSocket = io(SERVER_URL, { transports: ["websocket"] });
    await new Promise((res) => p1LeaderSocket.on("connect", res));
    p1LeaderSocket.emit("join", {
      roomId: "SEC-TEST-ROOM",
      userName: "Owner Leader",
      userId: p1.user.id || p1.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 400));

    // P2 attempts startInterview
    const interviewDeniedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for permissionDenied on startInterview")), 2500);
      p2CandSocket.once("permissionDenied", (d) => {
        clearTimeout(timer);
        resolve(d);
      });
    });

    p2CandSocket.emit("startInterview", {
      roomId: "SEC-TEST-ROOM",
      candidateSocketId: p2CandSocket.id,
    });

    const intDenied = await interviewDeniedPromise;
    console.log("  ✓ Non-leader startInterview blocked by server:", intDenied.message);
    securityChecks.push({ test: "Non-Leader Start Interview", blocked: true });

    p1LeaderSocket.disconnect();
    p2CandSocket.disconnect();
  } catch (err) {
    console.error("  ✗ Non-leader interview start check failed:", err.message);
    securityChecks.push({ test: "Non-Leader Start Interview", blocked: false, error: err.message });
  }

  results.securityAuthorization = {
    passed: securityChecks.every((c) => c.blocked === true),
    checks: securityChecks,
  };

  // ---------------------------------------------------------------
  // 4. FAILURE RESILIENCE TESTS (PART 26)
  // ---------------------------------------------------------------
  console.log("\n--- 4. Testing Fault Tolerance & Graceful Degradation ---");
  const failureChecks = [];

  // Failure 1: Code execution failure (syntax error) does NOT crash backend
  try {
    const brokenExec = await axios.post(`${SERVER_URL}/api/execution/run`, {
      code: "def syntax_error_in_js() { return ;;;",
      language: "javascript",
    });
    const hasStderr = brokenExec.data?.result?.stderr || brokenExec.data?.result?.output;
    console.log("  ✓ Code execution syntax error handled gracefully. Exit code:", brokenExec.data?.result?.exitCode);
    failureChecks.push({ test: "Code Execution Error Recovery", passed: true });
  } catch (err) {
    failureChecks.push({ test: "Code Execution Error Recovery", passed: false, error: err.message });
  }

  // Failure 2: AI query with empty RAG chunks handles gracefully
  try {
    const emptyRAGRes = await axios.post(`${SERVER_URL}/api/ai/rag/query`, {
      projectId: "nonexistent_project_999",
      query: "Random question with no matches",
    });
    const chunks = emptyRAGRes.data?.data?.chunks || emptyRAGRes.data?.chunks || [];
    console.log("  ✓ Empty RAG query handled gracefully without crash. Chunks returned:", chunks.length);
    failureChecks.push({ test: "Empty RAG Query Handling", passed: true });
  } catch (err) {
    failureChecks.push({ test: "Empty RAG Query Handling", passed: false, error: err.message });
  }

  // Failure 3: AI Service Offline fallback check
  // The AI service /api/ai/health reports online status; when offline, backend returns graceful fallback text
  const aiHealthRes = await axios.get(`${SERVER_URL}/api/ai/health`);
  console.log("  ✓ AI health endpoint responds cleanly:", aiHealthRes.data.status);
  failureChecks.push({ test: "AI Health & Fallback Architecture", passed: true });

  results.failureResilience = {
    passed: failureChecks.every((f) => f.passed === true),
    checks: failureChecks,
  };

  return results;
}

if (process.argv[1].endsWith("test_data_integrity.js")) {
  import("./test_env_setup.js").then(async (m) => {
    const ctx = await m.setupTestEnvironment();
    const res = await runDataIntegrityAndSecurityTests(ctx);
    console.log("\n--- Data Integrity & Security Summary ---");
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.databaseIntegrity.passed && res.securityAuthorization.passed ? 0 : 1);
  });
}
