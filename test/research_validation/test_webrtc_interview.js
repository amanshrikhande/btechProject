import io from "../../frontend/node_modules/socket.io-client/build/esm/index.js";
import axios from "axios";
import mongoose from "mongoose";

const SERVER_URL = "http://localhost:5000";

export async function runWebRTCAndInterviewTests(testContext) {
  console.log("\n=======================================================");
  console.log("=== PART 10, 11, 17, 18: WEBRTC & INTERVIEW/ATTENTION ===");
  console.log("=======================================================\n");

  const results = {
    interviewMode: { passed: false, details: {} },
    attentionEvents: { passed: false, receivedAlerts: [] },
    webRTC: { passed: false, details: {} },
  };

  const p1 = testContext.authResults["participant1@test.dev"];
  const p2 = testContext.authResults["participant2@test.dev"];
  const projectId = testContext.testProject?._id || testContext.testProject?.id;

  const testRoomId = "EXP-INTERVIEW-WEBRTC-001";

  const leadSocket = io(SERVER_URL, { transports: ["websocket"] });
  const candSocket = io(SERVER_URL, { transports: ["websocket"] });

  try {
    await Promise.all([
      new Promise((res) => leadSocket.on("connect", res)),
      new Promise((res) => candSocket.on("connect", res)),
    ]);

    leadSocket.emit("join", {
      roomId: testRoomId,
      userName: "Interviewer Leader",
      userId: p1.user.id || p1.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 200));

    candSocket.emit("join", {
      roomId: testRoomId,
      userName: "Candidate Dev",
      userId: p2.user.id || p2.user._id,
      projectId,
    });
    await new Promise((r) => setTimeout(r, 300));

    // ---------------------------------------------------------------
    // 1. INTERVIEW MODE ACTIVATION (PART 10 & 17)
    // ---------------------------------------------------------------
    console.log("--- 1. Testing Interview Mode Lifecycle ---");
    const interviewStartedPromise = new Promise((resolve) => {
      candSocket.once("interviewStarted", (data) => resolve(data));
    });

    leadSocket.emit("startInterview", {
      roomId: testRoomId,
      candidateSocketId: candSocket.id,
      candidateName: "Candidate Dev",
      candidateId: p2.user.id || p2.user._id,
    });

    const startData = await interviewStartedPromise;
    console.log("  ✓ Interview Started event received by candidate:", startData.active === true);

    // ---------------------------------------------------------------
    // 2. FOCUS & VISIBILITY MONITORING (PART 11 & 17)
    // ---------------------------------------------------------------
    console.log("--- 2. Testing Candidate Attention / Focus Telemetry ---");
    const focusEventsToTest = [
      "TAB_HIDDEN",
      "TAB_VISIBLE",
      "WINDOW_BLURRED",
      "WINDOW_FOCUSED",
      "FULLSCREEN_ENTERED",
      "FULLSCREEN_EXITED",
    ];

    const capturedAlerts = [];

    // Setup listener on Leader for real-time alerts
    leadSocket.on("interviewActivityAlert", (alert) => {
      capturedAlerts.push(alert.eventType);
    });

    for (const evt of focusEventsToTest) {
      candSocket.emit("candidateFocusEvent", {
        roomId: testRoomId,
        eventType: evt,
        metadata: { timestamp: Date.now(), testTrigger: true },
      });
      await new Promise((r) => setTimeout(r, 150));
    }

    await new Promise((r) => setTimeout(r, 500));
    console.log("  ✓ Leader captured real-time activity alerts:", capturedAlerts);

    const allFocusCaptured = focusEventsToTest.every((evt) => capturedAlerts.includes(evt));

    // End interview
    const interviewEndedPromise = new Promise((resolve) => {
      candSocket.once("interviewEnded", (data) => resolve(data));
    });

    leadSocket.emit("endInterview", { roomId: testRoomId });
    const endData = await interviewEndedPromise;
    console.log("  ✓ Interview ended cleanly. Duration:", endData.durationSeconds, "s");

    results.interviewMode = {
      passed: startData.active && endData.durationSeconds >= 0,
      details: { startData, endData },
    };

    results.attentionEvents = {
      passed: allFocusCaptured,
      testedEvents: focusEventsToTest,
      capturedEvents: capturedAlerts,
    };

    // ---------------------------------------------------------------
    // 3. WEBRTC SIGNALING PROTOCOL (PART 18)
    // ---------------------------------------------------------------
    console.log("--- 3. Testing WebRTC Peer Signaling ---");

    const candJoinedWebRTCPromise = new Promise((resolve) => {
      candSocket.once("webrtc-user-joined", (data) => resolve(data));
    });

    leadSocket.emit("webrtc-join", { roomId: testRoomId });
    const candNotifiedJoin = await candJoinedWebRTCPromise;
    console.log("  ✓ WebRTC peer join announced to candidate:", candNotifiedJoin.userName);

    // Offer / Answer signaling exchange
    const offerExchangePromise = new Promise((resolve) => {
      candSocket.once("webrtc-signal", (data) => resolve(data));
    });

    leadSocket.emit("webrtc-signal", {
      targetSocketId: candSocket.id,
      signal: { type: "offer", sdp: "v=0\r\no=DevShare-Mock-Offer" },
    });

    const candReceivedOffer = await offerExchangePromise;
    console.log("  ✓ WebRTC signal (offer) delivered via Socket.IO signaling channel:", candReceivedOffer.signal.type);

    // Media status toggle
    const mediaStatusPromise = new Promise((resolve) => {
      candSocket.once("webrtc-peer-media-status", (data) => resolve(data));
    });

    leadSocket.emit("webrtc-media-toggle", {
      roomId: testRoomId,
      audioEnabled: false,
      videoEnabled: true,
    });

    const mediaStatus = await mediaStatusPromise;
    console.log("  ✓ Media toggle status exchanged (audio: false, video: true):", mediaStatus);

    // Candidate leaves WebRTC
    const peerLeftPromise = new Promise((resolve) => {
      leadSocket.once("webrtc-user-left", (data) => resolve(data));
    });

    candSocket.emit("webrtc-leave", { roomId: testRoomId });
    const peerLeft = await peerLeftPromise;
    console.log("  ✓ WebRTC peer disconnection handled cleanly:", peerLeft.socketId === candSocket.id);

    leadSocket.disconnect();
    candSocket.disconnect();
    await new Promise((r) => setTimeout(r, 400));

    results.webRTC = {
      passed: candNotifiedJoin && candReceivedOffer && mediaStatus && peerLeft,
      details: {
        signalingProtocol: "Socket.IO signaling relay",
        offerDelivered: candReceivedOffer.signal.type === "offer",
        mediaToggleSynced: mediaStatus.videoEnabled === true && mediaStatus.audioEnabled === false,
        peerDisconnectObserved: true,
      },
    };
  } catch (err) {
    console.error("  ✗ WebRTC/Interview Test Failed:", err.message);
    results.interviewMode = { passed: false, error: err.message };
  }

  return results;
}

if (process.argv[1].endsWith("test_webrtc_interview.js")) {
  import("./test_env_setup.js").then(async (m) => {
    const ctx = await m.setupTestEnvironment();
    const res = await runWebRTCAndInterviewTests(ctx);
    console.log("\n--- WebRTC & Interview Test Summary ---");
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.interviewMode.passed && res.attentionEvents.passed && res.webRTC.passed ? 0 : 1);
  });
}
