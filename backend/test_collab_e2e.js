import io from "../frontend/node_modules/socket.io-client/build/esm/index.js";

const SERVER_URL = "http://localhost:5000";
const ROOM_ID = "e2e_room_test";

async function runTests() {
  console.log("=== STARTING DEVSHARE E2E INTEGRATION TESTS ===");

  let step = 1;
  const logStep = (msg) => console.log(`\n[TEST ${step++}] ${msg}`);

  // Connect Aman (Leader)
  const socketAman = io(SERVER_URL, { transports: ["websocket"] });
  // Connect Rahul (Collaborator/Candidate)
  const socketRahul = io(SERVER_URL, { transports: ["websocket"] });

  await Promise.all([
    new Promise((resolve) => socketAman.on("connect", resolve)),
    new Promise((resolve) => socketRahul.on("connect", resolve)),
  ]);
  console.log("✓ Sockets connected: Aman & Rahul");

  // TEST 1: Two users join the same room. Both can collaborate initially.
  logStep("Two users join room. Initial state verification.");
  socketAman.emit("join", { roomId: ROOM_ID, userName: "Aman", userId: "650000000000000000000001" });
  await new Promise((r) => setTimeout(r, 400));
  socketRahul.emit("join", { roomId: ROOM_ID, userName: "Rahul", userId: "650000000000000000000002" });
  await new Promise((r) => setTimeout(r, 600));
  console.log("✓ Aman and Rahul joined room.");

  // TEST 2: Leader enables Leader Mode. Non-leader becomes VIEW ONLY.
  logStep("Aman enables Leader Mode. Non-leader becomes VIEW ONLY.");
  const rahulViewOnlyPromise = new Promise((resolve) => {
    socketRahul.on("editPermissionChanged", (data) => {
      console.log("  -> Rahul received editPermissionChanged:", data);
      if (data.canEdit === false && data.role === "VIEWER") {
        resolve(data);
      }
    });
  });

  socketAman.emit("setLeaderMode", { roomId: ROOM_ID, enabled: true });
  await rahulViewOnlyPromise;
  console.log("✓ Leader Mode enabled. Rahul is now VIEW ONLY.");

  // TEST 3: Rahul tries to send codeChange while in VIEW ONLY. Server REJECTS it.
  logStep("Rahul tries to send codeChange while in VIEW ONLY. Server rejects it.");
  const rejectionPromise = new Promise((resolve) => {
    socketRahul.on("permissionDenied", (data) => {
      console.log("  -> Rahul received server rejection:", data.message);
      resolve(data);
    });
  });

  socketRahul.emit("codeChange", {
    roomId: ROOM_ID,
    code: "console.log('hacked');",
    fileId: "test_file",
  });
  await rejectionPromise;
  console.log("✓ Server-side security verified: Unauthorized code change rejected!");

  // TEST 4: Leader grants Rahul edit permission.
  logStep("Aman grants Rahul edit permission.");
  const rahulGrantedPromise = new Promise((resolve) => {
    socketRahul.on("editPermissionChanged", (data) => {
      if (data.canEdit === true && data.role === "EDITOR") {
        console.log("  -> Rahul received grant notification:", data);
        resolve(data);
      }
    });
  });

  socketAman.emit("grantEditPermission", { roomId: ROOM_ID, targetSocketId: socketRahul.id });
  await rahulGrantedPromise;
  console.log("✓ Edit permission granted. Rahul is now EDITOR.");

  // TEST 5: Rahul edits code -> accepted and received by Aman.
  logStep("Rahul emits codeChange as EDITOR. Aman receives codeUpdate.");
  const codeUpdatePromise = new Promise((resolve) => {
    socketAman.on("codeUpdate", (data) => {
      console.log("  -> Aman received codeUpdate from:", data.updatedBy);
      resolve(data);
    });
  });

  socketRahul.emit("codeChange", {
    roomId: ROOM_ID,
    code: "const x = 42;",
    fileId: "test_file",
  });
  await codeUpdatePromise;
  console.log("✓ Code update broadcasted successfully.");

  // TEST 6: Leader revokes Rahul's edit permission.
  logStep("Aman revokes Rahul's edit permission.");
  const rahulRevokedPromise = new Promise((resolve) => {
    socketRahul.on("editPermissionChanged", (data) => {
      if (data.canEdit === false && data.role === "VIEWER") {
        console.log("  -> Rahul received revoke notification:", data);
        resolve(data);
      }
    });
  });

  socketAman.emit("revokeEditPermission", { roomId: ROOM_ID, targetSocketId: socketRahul.id });
  await rahulRevokedPromise;
  console.log("✓ Edit permission revoked. Rahul is VIEW ONLY again.");

  // TEST 7: WebRTC Signaling.
  logStep("WebRTC signaling mesh test.");
  const webrtcUserJoinedPromise = new Promise((resolve) => {
    socketRahul.on("webrtc-user-joined", (data) => {
      console.log("  -> Rahul notified of WebRTC peer join:", data.userName);
      resolve(data);
    });
  });

  socketAman.emit("webrtc-join", { roomId: ROOM_ID });
  await webrtcUserJoinedPromise;

  const signalPromise = new Promise((resolve) => {
    socketRahul.on("webrtc-signal", (data) => {
      console.log("  -> Rahul received WebRTC signal from Aman:", data.signal.type);
      resolve(data);
    });
  });

  socketAman.emit("webrtc-signal", {
    targetSocketId: socketRahul.id,
    signal: { type: "offer", sdp: "mock_sdp_offer_data" },
  });
  await signalPromise;

  // Media toggle test
  const mediaTogglePromise = new Promise((resolve) => {
    socketRahul.on("webrtc-peer-media-status", (data) => {
      console.log("  -> Rahul received Aman's media status:", data);
      resolve(data);
    });
  });

  socketAman.emit("webrtc-media-toggle", { roomId: ROOM_ID, audioEnabled: false, videoEnabled: true });
  await mediaTogglePromise;
  console.log("✓ WebRTC signaling and media status exchange verified.");

  // TEST 8: Interview Mode & Focus Monitoring.
  logStep("Leader starts Interview Mode with Rahul as Candidate.");
  const interviewStartedPromise = new Promise((resolve) => {
    socketRahul.on("interviewStarted", (data) => {
      console.log("  -> Rahul notified interview started:", data);
      resolve(data);
    });
  });

  socketAman.emit("startInterview", {
    roomId: ROOM_ID,
    candidateSocketId: socketRahul.id,
    candidateName: "Rahul",
    candidateId: "650000000000000000000002",
  });
  await interviewStartedPromise;
  console.log("✓ Interview Mode successfully activated.");

  // TEST 9: Candidate Focus Event (TAB_HIDDEN & TAB_VISIBLE).
  logStep("Candidate focus events (TAB_HIDDEN & TAB_VISIBLE).");
  const tabHiddenAlertPromise = new Promise((resolve) => {
    socketAman.on("interviewActivityAlert", (data) => {
      if (data.eventType === "TAB_HIDDEN") {
        console.log("  -> Aman received alert:", data.eventType, "from", data.candidateName);
        resolve(data);
      }
    });
  });

  socketRahul.emit("candidateFocusEvent", {
    roomId: ROOM_ID,
    eventType: "TAB_HIDDEN",
    metadata: { reason: "User switched tab" },
  });
  await tabHiddenAlertPromise;

  const tabVisibleAlertPromise = new Promise((resolve) => {
    socketAman.on("interviewActivityAlert", (data) => {
      if (data.eventType === "TAB_VISIBLE") {
        console.log("  -> Aman received alert:", data.eventType, "from", data.candidateName);
        resolve(data);
      }
    });
  });

  socketRahul.emit("candidateFocusEvent", {
    roomId: ROOM_ID,
    eventType: "TAB_VISIBLE",
    metadata: { reason: "User returned" },
  });
  await tabVisibleAlertPromise;
  console.log("✓ Focus and visibility events successfully logged and delivered to Leader.");

  // TEST 10: End Interview
  logStep("Leader ends Interview Mode.");
  const interviewEndedPromise = new Promise((resolve) => {
    socketRahul.on("interviewEnded", (data) => {
      console.log("  -> Rahul notified interview ended:", data);
      resolve(data);
    });
  });

  socketAman.emit("endInterview", { roomId: ROOM_ID });
  await interviewEndedPromise;
  console.log("✓ Interview Mode ended.");

  // TEST 11: Analytics Verification
  logStep("Verify recorded session metrics via Analytics API.");
  await new Promise((r) => setTimeout(r, 600));

  const res = await fetch(`${SERVER_URL}/api/analytics/room/${ROOM_ID}`);
  const analytics = await res.json();
  console.log("Analytics Response Summary:", {
    collaborationMode: analytics.data.collaborationMode,
    participantsCount: analytics.data.participantsCount,
    codeChanges: analytics.data.codeChanges,
    permissionChanges: analytics.data.permissionChanges,
    focusEvents: analytics.data.focusEvents,
    leaderModeChanges: analytics.data.leaderModeChanges,
    totalEventsRecorded: analytics.data.totalEventsRecorded,
    editParticipation: analytics.data.editParticipation,
  });

  if (analytics.data.totalEventsRecorded > 0 && analytics.data.focusEvents >= 1) {
    console.log("✓ Analytics recorded research events accurately in MongoDB!");
  } else {
    throw new Error("Analytics events count mismatch!");
  }

  socketAman.disconnect();
  socketRahul.disconnect();

  console.log("\n==================================================");
  console.log("ALL 11 INTEGRATION TESTS PASSED SUCCESSFULLY! ✓✓✓");
  console.log("==================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
