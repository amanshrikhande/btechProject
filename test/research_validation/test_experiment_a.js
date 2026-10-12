import io from "../../frontend/node_modules/socket.io-client/build/esm/index.js";
import axios from "axios";
import mongoose from "mongoose";

const SERVER_URL = "http://localhost:5000";

export async function runExperimentATests(testContext) {
  console.log("\n=======================================================");
  console.log("=== PART 4, 5, 6: EXPERIMENT A VALIDATION TESTS ===");
  console.log("=======================================================\n");

  const results = {
    normalCollaboration: { passed: false, details: {} },
    controlledCollaboration: { passed: false, details: {} },
    metricsValidation: { passed: false, details: {} },
  };

  const p1 = testContext.authResults["participant1@test.dev"];
  const p2 = testContext.authResults["participant2@test.dev"];
  const projectId = testContext.testProject?._id || testContext.testProject?.id;

  // -----------------------------------------------------------------
  // 1. NORMAL COLLABORATION TEST (Session: EXP-A-TEST-NORMAL-001)
  // -----------------------------------------------------------------
  console.log("--- 1. Testing NORMAL Collaboration (EXP-A-TEST-NORMAL-001) ---");
  const normalRoomId = "EXP-A-TEST-NORMAL-001";

  const socketP1 = io(SERVER_URL, { transports: ["websocket"] });
  const socketP2 = io(SERVER_URL, { transports: ["websocket"] });

  try {
    await Promise.all([
      new Promise((res) => socketP1.on("connect", res)),
      new Promise((res) => socketP2.on("connect", res)),
    ]);
    console.log("  ✓ Both sockets connected to server.");

    // Join room
    socketP1.emit("join", {
      roomId: normalRoomId,
      userName: "Participant 1",
      userId: p1.user.id || p1.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 300));

    socketP2.emit("join", {
      roomId: normalRoomId,
      userName: "Participant 2",
      userId: p2.user.id || p2.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 400));

    // File opened event
    socketP1.emit("activeFileChange", {
      roomId: normalRoomId,
      fileId: "file_auth_01",
      fileName: "auth.js",
    });

    // Test code synchronization: P1 edits, P2 receives
    const p2ReceivePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for codeUpdate on P2")), 3000);
      socketP2.once("codeUpdate", (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socketP1.emit("codeChange", {
      roomId: normalRoomId,
      code: "const version = '1.0.0';",
      fileId: "file_auth_01",
      language: "javascript",
    });

    const receivedByP2 = await p2ReceivePromise;
    console.log("  ✓ P1 code change propagated to P2:", receivedByP2.code);

    // Test reverse code synchronization: P2 edits, P1 receives
    const p1ReceivePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for codeUpdate on P1")), 3000);
      socketP1.once("codeUpdate", (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socketP2.emit("codeChange", {
      roomId: normalRoomId,
      code: "const version = '1.0.1'; // P2 edit",
      fileId: "file_auth_01",
      language: "javascript",
    });

    const receivedByP1 = await p1ReceivePromise;
    console.log("  ✓ P2 code change propagated to P1:", receivedByP1.code);

    // Test Code Execution via socket
    const execPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for executionResult")), 8000);
      socketP1.once("codeResponse", (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });

    socketP1.emit("compileCode", {
      code: "console.log('DevShare Piston Test');",
      roomId: normalRoomId,
      language: "javascript",
      projectId,
    });

    const execResult = await execPromise;
    console.log("  ✓ Code executed on backend Piston service. Output:", execResult?.run?.output?.trim());

    // Disconnect sockets to finish session
    socketP1.disconnect();
    socketP2.disconnect();
    await new Promise((r) => setTimeout(r, 600));

    // Verify Analytics for NORMAL session
    const normalAnalyticsRes = await axios.get(`${SERVER_URL}/api/analytics/room/${normalRoomId}`);
    const normalData = normalAnalyticsRes.data.data;

    console.log("  [NORMAL Session Analytics Audit]:", {
      participantsCount: normalData.participantsCount,
      codeChanges: normalData.codeChanges,
      executions: normalData.executions,
      sessionDuration: normalData.sessionDuration,
      collaborationMode: normalData.collaborationMode,
    });

    results.normalCollaboration = {
      passed: normalData.participantsCount >= 2 && normalData.executions >= 1,
      details: normalData,
    };
  } catch (err) {
    console.error("  ✗ NORMAL Collaboration Test Failed:", err.message);
    results.normalCollaboration = { passed: false, error: err.message };
  }

  // -----------------------------------------------------------------
  // 2. CONTROLLED COLLABORATION TEST (LEADER MODE)
  // -----------------------------------------------------------------
  console.log("\n--- 2. Testing CONTROLLED Collaboration / Leader Mode (EXP-A-TEST-CONTROLLED-001) ---");
  const controlledRoomId = "EXP-A-TEST-CONTROLLED-001";

  const leadSocketP1 = io(SERVER_URL, { transports: ["websocket"] });
  const viewSocketP2 = io(SERVER_URL, { transports: ["websocket"] });

  try {
    await Promise.all([
      new Promise((res) => leadSocketP1.on("connect", res)),
      new Promise((res) => viewSocketP2.on("connect", res)),
    ]);

    leadSocketP1.emit("join", {
      roomId: controlledRoomId,
      userName: "Participant 1 (Leader)",
      userId: p1.user.id || p1.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 300));

    viewSocketP2.emit("join", {
      roomId: controlledRoomId,
      userName: "Participant 2",
      userId: p2.user.id || p2.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 400));

    // P1 enables Leader Mode
    const p2LockedPromise = new Promise((resolve) => {
      viewSocketP2.once("editPermissionChanged", (perm) => resolve(perm));
    });
    leadSocketP1.emit("setLeaderMode", { roomId: controlledRoomId, enabled: true });
    const p2LockState = await p2LockedPromise;
    console.log("  ✓ Leader Mode enabled. P2 role:", p2LockState.role, "canEdit:", p2LockState.canEdit);

    // SECURITY REJECTION TEST 1: P2 attempts unauthorized codeChange
    console.log("  -> Testing Security: P2 sends unauthorized codeChange event...");
    const rejectionPromise1 = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server failed to emit permissionDenied")), 3000);
      viewSocketP2.once("permissionDenied", (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    viewSocketP2.emit("codeChange", {
      roomId: controlledRoomId,
      code: "ATTEMPT_UNAUTHORIZED_MUTATION = true;",
      fileId: "file_auth_01",
    });

    const rejection1 = await rejectionPromise1;
    console.log("  ✓ SERVER-SIDE SECURITY ENFORCEMENT: Edit rejected with:", rejection1.message);

    // Leader grants P2 edit permission
    console.log("  -> Leader grants P2 edit permission...");
    const p2GrantedPromise = new Promise((resolve) => {
      viewSocketP2.once("editPermissionChanged", (perm) => resolve(perm));
    });

    leadSocketP1.emit("grantEditPermission", {
      roomId: controlledRoomId,
      targetSocketId: viewSocketP2.id,
    });
    const p2GrantState = await p2GrantedPromise;
    console.log("  ✓ P2 permission updated: role =", p2GrantState.role, "canEdit =", p2GrantState.canEdit);

    // P2 edits code as EDITOR -> Leader must receive it
    const leaderReceivesP2Edit = new Promise((resolve) => {
      leadSocketP1.once("codeUpdate", (data) => resolve(data));
    });

    viewSocketP2.emit("codeChange", {
      roomId: controlledRoomId,
      code: "AUTHORIZED_PARTICIPANT_2_EDIT = true;",
      fileId: "file_auth_01",
    });

    const receivedByLeader = await leaderReceivesP2Edit;
    console.log("  ✓ Authorized edit from P2 received by Leader:", receivedByLeader.code);

    // Leader revokes P2 edit permission
    console.log("  -> Leader revokes P2 edit permission...");
    const p2RevokedPromise = new Promise((resolve) => {
      viewSocketP2.once("editPermissionChanged", (perm) => resolve(perm));
    });

    leadSocketP1.emit("revokeEditPermission", {
      roomId: controlledRoomId,
      targetSocketId: viewSocketP2.id,
    });
    const p2RevokedState = await p2RevokedPromise;
    console.log("  ✓ P2 permission revoked: role =", p2RevokedState.role, "canEdit =", p2RevokedState.canEdit);

    // SECURITY REJECTION TEST 2: P2 attempts code change again after revocation
    console.log("  -> Testing Security: P2 attempts edit after revocation...");
    const rejectionPromise2 = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server failed to emit permissionDenied on 2nd attempt")), 3000);
      viewSocketP2.once("permissionDenied", (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    viewSocketP2.emit("codeChange", {
      roomId: controlledRoomId,
      code: "SECOND_UNAUTHORIZED_MUTATION = true;",
      fileId: "file_auth_01",
    });

    const rejection2 = await rejectionPromise2;
    console.log("  ✓ SERVER-SIDE SECURITY ENFORCEMENT: Second edit rejected with:", rejection2.message);

    leadSocketP1.disconnect();
    viewSocketP2.disconnect();
    await new Promise((r) => setTimeout(r, 600));

    results.controlledCollaboration = {
      passed: p2LockState.canEdit === false && rejection1 && p2GrantState.canEdit === true && p2RevokedState.canEdit === false && rejection2,
      details: {
        leaderModeEnforced: true,
        rejection1Message: rejection1.message,
        grantSuccess: p2GrantState.canEdit,
        rejection2Message: rejection2.message,
      },
    };
  } catch (err) {
    console.error("  ✗ CONTROLLED Collaboration Test Failed:", err.message);
    results.controlledCollaboration = { passed: false, error: err.message };
  }

  // -----------------------------------------------------------------
  // 3. COLLABORATION METRICS & EDIT PARTICIPATION RATIO TEST
  // -----------------------------------------------------------------
  console.log("\n--- 3. Testing Collaboration Edit Participation Calculation (70/30 Test) ---");
  const metricsRoomId = "EXP-A-METRICS-70-30";

  const mSocketP1 = io(SERVER_URL, { transports: ["websocket"] });
  const mSocketP2 = io(SERVER_URL, { transports: ["websocket"] });

  try {
    await Promise.all([
      new Promise((res) => mSocketP1.on("connect", res)),
      new Promise((res) => mSocketP2.on("connect", res)),
    ]);

    mSocketP1.emit("join", {
      roomId: metricsRoomId,
      userName: "Participant 1",
      userId: p1.user.id || p1.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 200));

    mSocketP2.emit("join", {
      roomId: metricsRoomId,
      userName: "Participant 2",
      userId: p2.user.id || p2.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 300));

    // In backend/controllers/analytics.controller.js:
    // User edits are counted by events or codeChange. Note: in socketManager.js:
    // logEvent for CODE_EDIT has an 8-second throttle per user to prevent DB flooding.
    // However, analytics.controller.js also aggregates events logged in SessionEvent.
    // Let's directly test the mathematical calculation logic in analytics.controller.js
    // by injecting exact 70 and 30 edits into the database for this session or via HTTP event logging!

    console.log("  -> Injecting exact 70 edits for P1 and 30 edits for P2 to test participation formula...");
    const SessionEvent = mongoose.model(
      "SessionEvent",
      new mongoose.Schema({
        roomId: String,
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        eventType: String,
        timestamp: Date,
      })
    );

    // Ensure mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect("mongodb://127.0.0.1:27017/devshare");
    }

    const p1Events = Array.from({ length: 70 }, (_, i) => ({
      roomId: metricsRoomId,
      userId: new mongoose.Types.ObjectId(p1.user.id || p1.user._id),
      userName: "Participant 1",
      eventType: "CODE_EDIT",
      timestamp: new Date(),
    }));

    const p2Events = Array.from({ length: 30 }, (_, i) => ({
      roomId: metricsRoomId,
      userId: new mongoose.Types.ObjectId(p2.user.id || p2.user._id),
      userName: "Participant 2",
      eventType: "CODE_EDIT",
      timestamp: new Date(),
    }));

    await SessionEvent.insertMany([...p1Events, ...p2Events]);
    console.log("  ✓ Stored 100 CODE_EDIT events (70 for P1, 30 for P2) in MongoDB.");

    mSocketP1.disconnect();
    mSocketP2.disconnect();
    await new Promise((r) => setTimeout(r, 400));

    // Fetch analytics endpoint to verify calculation
    const metricsRes = await axios.get(`${SERVER_URL}/api/analytics/room/${metricsRoomId}`);
    const metricsData = metricsRes.data.data;

    console.log("  [Calculated Edit Participation Output]:", metricsData.editParticipation);

    const p1Stat = metricsData.editParticipation.find((p) => p.userName === "Participant 1");
    const p2Stat = metricsData.editParticipation.find((p) => p.userName === "Participant 2");

    const p1Pct = p1Stat?.percentage;
    const p2Pct = p2Stat?.percentage;

    console.log(`  P1 percentage: ${p1Pct}% (Expected: 70.0%)`);
    console.log(`  P2 percentage: ${p2Pct}% (Expected: 30.0%)`);
    console.log(`  Reported Conflict Rate: "${metricsData.conflictRate}"`);

    const participationAccurate = Math.abs(p1Pct - 70.0) < 0.1 && Math.abs(p2Pct - 30.0) < 0.1;

    results.metricsValidation = {
      passed: participationAccurate,
      details: {
        p1Percentage: p1Pct,
        p2Percentage: p2Pct,
        totalEdits: metricsData.codeChanges,
        conflictRate: metricsData.conflictRate,
        participationAccurate,
      },
    };
  } catch (err) {
    console.error("  ✗ Metrics Validation Test Failed:", err.message);
    results.metricsValidation = { passed: false, error: err.message };
  }

  return results;
}

if (process.argv[1].endsWith("test_experiment_a.js")) {
  import("./test_env_setup.js").then(async (m) => {
    const ctx = await m.setupTestEnvironment();
    const res = await runExperimentATests(ctx);
    console.log("\n--- Experiment A Test Summary ---");
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.normalCollaboration.passed && res.controlledCollaboration.passed && res.metricsValidation.passed ? 0 : 1);
  });
}
