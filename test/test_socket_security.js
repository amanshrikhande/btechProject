/**
 * DevShare Socket Leadership & Leader Mode Security Test Suite
 * Tests Requirements 4 and 21:
 * - Authoritative server-side project leadership resolution
 * - Project owner promotion
 * - Authorized project researcher promotion
 * - Unauthorized researcher rejection
 * - Unrelated admin rejection
 * - Normal collaborator non-promotion
 * - First participant non-promotion (never remaining[0] or first)
 * - Leader disconnect promotion to authorized member or null
 * - Sensitive event server-side authorization and permissionDenied emission
 */

import mongoose from "mongoose";
import { io } from "socket.io-client";
import { config } from "../backend/config/config.js";
import { User } from "../backend/models/User.js";
import { Project } from "../backend/models/Project.js";

const BACKEND_URL = `http://localhost:${config.port || 5000}`;

function assert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
  } else {
    console.error(`  [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function createClientSocket() {
  return io(BACKEND_URL, {
    transports: ["websocket"],
    forceNew: true,
    autoConnect: true,
  });
}

async function runSocketSecurityTests() {
  console.log("===============================================================");
  console.log("=== DEVSHARE SOCKET LEADERSHIP SECURITY TEST SUITE          ===");
  console.log("===============================================================");

  // 1. Connect Mongoose to create test fixture users and project
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB for test fixture setup.");

  const suffix = Date.now();
  const testRoomId = `room_sec_${suffix}`;

  // Create Users
  const ownerUser = await User.create({
    name: `Owner_${suffix}`,
    email: `owner_${suffix}@test.com`,
    passwordHash: "test_hashed_password_123",
    role: "developer",
  });

  const authResearcher = await User.create({
    name: `AuthResearcher_${suffix}`,
    email: `auth_res_${suffix}@test.com`,
    passwordHash: "test_hashed_password_123",
    role: "researcher",
  });

  const unauthResearcher = await User.create({
    name: `UnauthResearcher_${suffix}`,
    email: `unauth_res_${suffix}@test.com`,
    passwordHash: "test_hashed_password_123",
    role: "researcher",
  });

  const unrelatedAdmin = await User.create({
    name: `Admin_${suffix}`,
    email: `admin_${suffix}@test.com`,
    passwordHash: "test_hashed_password_123",
    role: "admin",
  });

  const normalCollaborator = await User.create({
    name: `Collab_${suffix}`,
    email: `collab_${suffix}@test.com`,
    passwordHash: "test_hashed_password_123",
    role: "developer",
  });

  // Create Project: owner is ownerUser, members include ownerUser, authResearcher, and normalCollaborator
  const testProject = await Project.create({
    name: `SecProject_${suffix}`,
    owner: ownerUser._id,
    activeRoomId: testRoomId,
    members: [
      { user: ownerUser._id, role: "owner" },
      { user: authResearcher._id, role: "editor" },
      { user: normalCollaborator._id, role: "editor" },
    ],
  });

  const projectId = testProject._id.toString();
  console.log(`Created test project ${projectId} with owner ${ownerUser._id}`);

  try {
    // -------------------------------------------------------------
    // TEST A: First participant joins (normalCollaborator)
    // Must NOT be promoted to leader simply for being first!
    // -------------------------------------------------------------
    console.log("\n--- TEST A: First Participant Non-Promotion ---");
    const socketCollab = createClientSocket();
    await wait(300);

    let collabState = null;
    socketCollab.on("roomStateSync", (st) => { collabState = st; });

    socketCollab.emit("join", {
      roomId: testRoomId,
      userName: normalCollaborator.name,
      userId: normalCollaborator._id.toString(),
      projectId,
    });
    await wait(400);

    assert(collabState !== null, "Collaborator received roomStateSync");
    assert(
      collabState.leaderId !== normalCollaborator._id.toString() &&
      collabState.leaderSocketId !== socketCollab.id,
      "First participant (collaborator) is NOT automatically promoted to leader"
    );

    // -------------------------------------------------------------
    // TEST B: Project Owner joins
    // Must be recognized as authoritative project leader
    // -------------------------------------------------------------
    console.log("\n--- TEST B: Authoritative Project Owner Promotion ---");
    const socketOwner = createClientSocket();
    await wait(300);

    let ownerState = null;
    socketOwner.on("roomStateSync", (st) => { ownerState = st; });

    socketOwner.emit("join", {
      roomId: testRoomId,
      userName: ownerUser.name,
      userId: ownerUser._id.toString(),
      projectId,
    });
    await wait(400);

    assert(ownerState !== null, "Owner received roomStateSync");
    assert(
      ownerState.leaderId === ownerUser._id.toString() ||
      ownerState.leaderSocketId === socketOwner.id,
      "Project owner is promoted to Room Leader"
    );

    // -------------------------------------------------------------
    // TEST C: Unauthorized participant attempts sensitive action
    // (setLeaderMode from non-leader socket)
    // -------------------------------------------------------------
    console.log("\n--- TEST C: Sensitive Action Authorization ---");
    let deniedEvent = null;
    socketCollab.on("permissionDenied", (d) => { deniedEvent = d; });

    socketCollab.emit("setLeaderMode", { roomId: testRoomId, enabled: true });
    await wait(400);

    assert(deniedEvent !== null, "Non-leader received permissionDenied on unauthorized setLeaderMode");

    // -------------------------------------------------------------
    // TEST D: Leader enables Leader Mode, non-leader codeChange rejected
    // -------------------------------------------------------------
    console.log("\n--- TEST D: Leader Mode Code Edit Enforcement ---");
    socketOwner.emit("setLeaderMode", { roomId: testRoomId, enabled: true });
    await wait(400);

    let editDenied = null;
    socketCollab.on("permissionDenied", (d) => { editDenied = d; });

    socketCollab.emit("codeChange", {
      roomId: testRoomId,
      code: "console.log('unauthorized edit attempt');",
      fileId: "dummy_file",
    });
    await wait(400);

    assert(editDenied !== null, "Viewer in Leader Mode received permissionDenied on codeChange");

    // -------------------------------------------------------------
    // TEST E: Authorized Researcher joins, Owner disconnects
    // Researcher authorized on project MUST be promoted
    // -------------------------------------------------------------
    console.log("\n--- TEST E: Leader Disconnect -> Authorized Researcher Promotion ---");
    const socketAuthRes = createClientSocket();
    await wait(300);

    socketAuthRes.emit("join", {
      roomId: testRoomId,
      userName: authResearcher.name,
      userId: authResearcher._id.toString(),
      projectId,
    });
    await wait(400);

    let leaderChangedEvent = null;
    socketCollab.on("leaderModeChanged", (evt) => { leaderChangedEvent = evt; });

    // Disconnect owner
    socketOwner.disconnect();
    await wait(600);

    assert(leaderChangedEvent !== null, "Room received leaderModeChanged on leader disconnect");
    assert(
      leaderChangedEvent.leaderSocketId === socketAuthRes.id,
      "Authorized project researcher promoted to Room Leader on owner disconnect"
    );

    // -------------------------------------------------------------
    // TEST F: Unauthorized Researcher joins, Authorized Researcher leaves
    // Unauthorized researcher (not on project) must NOT be promoted
    // -------------------------------------------------------------
    console.log("\n--- TEST F: Unauthorized Researcher Rejection ---");
    const socketUnauthRes = createClientSocket();
    await wait(300);

    socketUnauthRes.emit("join", {
      roomId: testRoomId,
      userName: unauthResearcher.name,
      userId: unauthResearcher._id.toString(),
      projectId,
    });
    await wait(400);

    leaderChangedEvent = null;
    socketAuthRes.disconnect();
    await wait(600);

    assert(leaderChangedEvent !== null, "Room updated after authorized leader disconnected");
    assert(
      leaderChangedEvent.leaderSocketId !== socketUnauthRes.id &&
      leaderChangedEvent.leaderSocketId === null,
      "Unauthorized researcher NOT promoted: leaderSocketId is null (NEVER remaining[0])"
    );

    // -------------------------------------------------------------
    // TEST G: Unrelated Admin joins
    // Must NOT be promoted without project membership
    // -------------------------------------------------------------
    console.log("\n--- TEST G: Unrelated Admin Non-Promotion ---");
    const socketAdmin = createClientSocket();
    await wait(300);

    let adminState = null;
    socketAdmin.on("roomStateSync", (st) => { adminState = st; });

    socketAdmin.emit("join", {
      roomId: testRoomId,
      userName: unrelatedAdmin.name,
      userId: unrelatedAdmin._id.toString(),
      projectId,
    });
    await wait(400);

    assert(
      adminState.leaderId !== unrelatedAdmin._id.toString() &&
      adminState.leaderSocketId !== socketAdmin.id,
      "Unrelated admin (not a project member) is NOT promoted to Room Leader"
    );

    // Disconnect remaining
    socketCollab.disconnect();
    socketUnauthRes.disconnect();
    socketAdmin.disconnect();

    console.log("\n===============================================================");
    console.log("=== ALL SOCKET LEADERSHIP SECURITY TESTS PASSED (100%)       ===");
    console.log("===============================================================");
  } finally {
    // Cleanup fixture documents
    await Project.findByIdAndDelete(testProject._id);
    await User.deleteMany({
      _id: {
        $in: [
          ownerUser._id,
          authResearcher._id,
          unauthResearcher._id,
          unrelatedAdmin._id,
          normalCollaborator._id,
        ],
      },
    });
    await mongoose.disconnect();
  }
}

runSocketSecurityTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n[TEST ERROR]:", err);
    process.exit(1);
  });
