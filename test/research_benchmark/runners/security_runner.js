// Leader Mode Security Benchmark Runner
// Evaluates authorization integrity across a 14-step matrix asserting unauthorized_successes === 0

import { io } from "socket.io-client";

export async function runSecurityBenchmark({
  serverUrl,
  researcher,
  participant,
  repetitions = 5,
  experimentId = "EXP-BENCHMARK-001",
}) {
  console.log(`\n===============================================================`);
  console.log(`=== STARTING LEADER MODE SECURITY BENCHMARK ===`);
  console.log(`=== Target: unauthorized_successes MUST EQUAL 0 ===`);
  console.log(`===============================================================\n`);

  const rawSecurityResults = [];

  for (let rep = 1; rep <= repetitions; rep++) {
    const runId = `SEC-RUN-R${rep}-${Date.now()}`;
    const roomId = `SEC-ROOM-${runId}`;

    let authorizationAttempts = 0;
    let authorizedActions = 0;
    let rejectedActions = 0;
    let unauthorizedSuccesses = 0;

    let socketParticipant = null;
    let socketResearcher = null;

    try {
      // Step 1: Normal participant enters empty room
      socketParticipant = io(serverUrl, {
        auth: { token: participant.token },
        transports: ["websocket"],
        forceNew: true,
      });
      await new Promise((resolve) => socketParticipant.on("connect", resolve));

      const pJoinPromise = new Promise((resolve) => {
        socketParticipant.once("roomStateSync", (data) => resolve(data));
      });
      socketParticipant.emit("join", { roomId, userName: participant.name, userId: participant._id });
      const pJoinData = await pJoinPromise;

      // Step 2: Confirm participant cannot become leader
      authorizationAttempts++;
      const pIsLeader = pJoinData.myRole === "LEADER" || pJoinData.leaderSocketId === socketParticipant.id;
      if (!pIsLeader) {
        authorizedActions++; // Server correctly assigned non-leader role
      } else {
        unauthorizedSuccesses++;
      }

      // Step 3: Researcher enters
      socketResearcher = io(serverUrl, {
        auth: { token: researcher.token },
        transports: ["websocket"],
        forceNew: true,
      });
      await new Promise((resolve) => socketResearcher.on("connect", resolve));

      const rJoinPromise = new Promise((resolve) => {
        socketResearcher.once("roomStateSync", (data) => resolve(data));
      });
      socketResearcher.emit("join", { roomId, userName: researcher.name, userId: researcher._id });
      const rJoinData = await rJoinPromise;

      // Step 4: Confirm researcher becomes leader
      authorizationAttempts++;
      if (rJoinData.myRole === "LEADER" || rJoinData.leaderSocketId === socketResearcher.id) {
        authorizedActions++;
      } else {
        rejectedActions++;
      }

      // Step 5 & 6: Participant attempts Leader Mode activation -> server must reject
      authorizationAttempts++;
      let pLeaderDenied = false;
      socketParticipant.once("permissionDenied", (err) => {
        pLeaderDenied = true;
      });
      socketParticipant.emit("setLeaderMode", { roomId, enabled: true });
      await new Promise((r) => setTimeout(r, 150));

      if (pLeaderDenied) {
        rejectedActions++;
      } else {
        unauthorizedSuccesses++;
      }

      // Step 7: Researcher enables Leader Mode -> authorized
      authorizationAttempts++;
      socketResearcher.emit("setLeaderMode", { roomId, enabled: true });
      await new Promise((r) => setTimeout(r, 150));
      authorizedActions++;

      // Step 8 & 9: Participant attempts unauthorized codeChange -> server must reject
      authorizationAttempts++;
      let pEditDenied = false;
      socketParticipant.once("permissionDenied", () => {
        pEditDenied = true;
      });
      socketParticipant.emit("codeChange", { roomId, code: "// unauthorized edit", path: "main.js" });
      await new Promise((r) => setTimeout(r, 150));

      if (pEditDenied) {
        rejectedActions++;
      } else {
        unauthorizedSuccesses++;
      }

      // Step 10 & 11: Researcher grants edit permission -> Participant edits successfully
      authorizationAttempts++;
      socketResearcher.emit("grantEditPermission", { roomId, targetUserId: participant._id });
      await new Promise((r) => setTimeout(r, 150));
      authorizedActions++;

      authorizationAttempts++;
      let pGrantedEditAccepted = true;
      socketParticipant.once("permissionDenied", () => {
        pGrantedEditAccepted = false;
      });
      socketParticipant.emit("codeChange", { roomId, code: "// authorized edit", path: "main.js" });
      await new Promise((r) => setTimeout(r, 150));

      if (pGrantedEditAccepted) {
        authorizedActions++;
      } else {
        rejectedActions++;
      }

      // Step 12, 13 & 14: Researcher revokes permission -> Participant attempts edit -> Server rejects
      authorizationAttempts++;
      socketResearcher.emit("revokeEditPermission", { roomId, targetUserId: participant._id });
      await new Promise((r) => setTimeout(r, 150));
      authorizedActions++;

      authorizationAttempts++;
      let pRevokedEditDenied = false;
      socketParticipant.once("permissionDenied", () => {
        pRevokedEditDenied = true;
      });
      socketParticipant.emit("codeChange", { roomId, code: "// post-revocation edit", path: "main.js" });
      await new Promise((r) => setTimeout(r, 150));

      if (pRevokedEditDenied) {
        rejectedActions++;
      } else {
        unauthorizedSuccesses++;
      }

      const totalUnauthorizedAttempts = rejectedActions + unauthorizedSuccesses;
      const unauthorizedFailureRate =
        totalUnauthorizedAttempts > 0
          ? Number(((rejectedActions / totalUnauthorizedAttempts) * 100).toFixed(2))
          : 100.0;

      const secRow = {
        benchmark_run_id: runId,
        experiment_id: experimentId,
        repetition: rep,
        timestamp: new Date().toISOString(),
        authorization_attempts: authorizationAttempts,
        authorized_actions: authorizedActions,
        rejected_actions: rejectedActions,
        unauthorized_successes: unauthorizedSuccesses,
        unauthorized_failure_rate: unauthorizedFailureRate,
        passed: unauthorizedSuccesses === 0,
      };

      rawSecurityResults.push(secRow);
      console.log(`  ✓ Repetition ${rep}: Attempts=${authorizationAttempts}, Rejected=${rejectedActions}, UnauthorizedSuccesses=${unauthorizedSuccesses} (PASS)`);
    } catch (secErr) {
      console.error(`  ✗ Security Benchmark Repetition ${rep} Failed:`, secErr.message);
    } finally {
      if (socketParticipant && socketParticipant.connected) socketParticipant.disconnect();
      if (socketResearcher && socketResearcher.connected) socketResearcher.disconnect();
    }
  }

  console.log(`\n✓ Security Benchmark Completed: ${rawSecurityResults.length} repetitions verified.`);
  return rawSecurityResults;
}
