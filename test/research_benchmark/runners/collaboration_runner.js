// Experiment A: Collaborative Programming Benchmark Runner
// Evaluates AUTOMATED_NORMAL vs AUTOMATED_CONTROLLED across standardized tasks

import { io } from "socket.io-client";
import axios from "axios";

export async function runCollaborationBenchmark({
  serverUrl,
  tasks,
  researcher,
  participantA,
  participantB,
  repetitions = 10,
  experimentId = "EXP-BENCHMARK-001",
  onProgress = () => {},
}) {
  const rawCollaborationRuns = [];
  const rawTaskResults = [];
  const rawExecutionResults = [];
  const rawPermissionEvents = [];
  const allEvents = [];

  const conditions = ["AUTOMATED_NORMAL", "AUTOMATED_CONTROLLED"];
  const totalSteps = conditions.length * tasks.length * repetitions;
  let currentStep = 0;

  console.log(`\n===============================================================`);
  console.log(`=== STARTING COLLABORATION BENCHMARK (EXPERIMENT A) ===`);
  console.log(`=== Conditions: ${conditions.join(", ")} ===`);
  console.log(`=== Tasks: ${tasks.length} | Repetitions: ${repetitions} | Total Runs: ${totalSteps} ===`);
  console.log(`===============================================================\n`);

  for (const condition of conditions) {
    for (const task of tasks) {
      // Ensure task exists in DB
      try {
        await axios.post(
          `${serverUrl}/api/tasks`,
          {
            experimentId,
            taskId: task.taskId,
            title: task.title,
            description: task.description,
            difficulty: task.difficulty,
            timeLimitMinutes: task.timeLimitMinutes,
            testSuite: task.testSuite,
            starterCode: task.starterCode,
          },
          { headers: { Authorization: `Bearer ${researcher.token}` } }
        );
      } catch (e) {
        // Already exists or updated
      }

      for (let rep = 1; rep <= repetitions; rep++) {
        currentStep++;
        const runId = `RUN-${condition.substring(10, 14)}-${task.taskId}-R${rep}-${Date.now()}`;
        const roomId = `ROOM-${runId}`;

        onProgress({
          stage: "collaboration",
          condition,
          taskId: task.taskId,
          repetition: rep,
          currentStep,
          totalSteps,
        });

        const runStartTs = Date.now();
        const pAToken = participantA.token;
        const pBToken = participantB.token;
        const resToken = researcher.token;

        // Metrics tracking for this run
        let totalCodeChanges = 0;
        let editsA = 0;
        let editsB = 0;
        let charsInserted = 0;
        let charsDeleted = 0;
        let linesAdded = 0;
        let linesDeleted = 0;
        let permissionGrants = 0;
        let permissionRevocations = 0;
        let permissionDeniedCount = 0;
        let simultaneousAttempts = 0;
        let executions = 0;
        let successfulExecutions = 0;
        let failedExecutions = 0;
        let timeInViewerStateMs = 0;
        let timeInEditorStateMs = 0;
        let reconnects = 0;
        let disconnects = 0;
        let eventsExchanged = 0;

        let socketRes = null;
        let socketA = null;
        let socketB = null;

        try {
          // Connect researcher socket if CONTROLLED
          if (condition === "AUTOMATED_CONTROLLED") {
            socketRes = io(serverUrl, {
              auth: { token: resToken },
              transports: ["websocket"],
              forceNew: true,
            });
            await new Promise((resolve) => socketRes.on("connect", resolve));
            socketRes.emit("join", { roomId, userName: researcher.name, userId: researcher._id });
            await new Promise((r) => setTimeout(r, 100));
            eventsExchanged += 2;
          }

          // Connect participant A
          socketA = io(serverUrl, {
            auth: { token: pAToken },
            transports: ["websocket"],
            forceNew: true,
          });
          await new Promise((resolve) => socketA.on("connect", resolve));
          socketA.emit("join", { roomId, userName: participantA.name, userId: participantA._id });
          await new Promise((r) => setTimeout(r, 100));
          eventsExchanged += 2;

          // Connect participant B
          socketB = io(serverUrl, {
            auth: { token: pBToken },
            transports: ["websocket"],
            forceNew: true,
          });
          await new Promise((resolve) => socketB.on("connect", resolve));
          socketB.emit("join", { roomId, userName: participantB.name, userId: participantB._id });
          await new Promise((r) => setTimeout(r, 100));
          eventsExchanged += 2;

          // Listen for permission denials on Participant B
          socketB.on("permissionDenied", () => {
            permissionDeniedCount++;
            eventsExchanged++;
          });

          // Start task session on backend for participant A
          const startRes = await axios.post(
            `${serverUrl}/api/tasks/${task.taskId}/start`,
            {
              experimentId,
              sessionId: roomId,
              condition: condition === "AUTOMATED_CONTROLLED" ? "CONTROLLED" : "NORMAL",
            },
            { headers: { Authorization: `Bearer ${pAToken}` } }
          );

          // Simulated Collaboration Execution
          const simStartTime = Date.now();

          if (condition === "AUTOMATED_CONTROLLED") {
            // Leader enables Leader Mode
            socketRes.emit("setLeaderMode", { roomId, enabled: true });
            eventsExchanged++;
            await new Promise((r) => setTimeout(r, 100));

            const viewerStart = Date.now();

            // Participant A (granted editor role by leader)
            socketRes.emit("grantEditPermission", { roomId, targetUserId: participantA._id });
            permissionGrants++;
            eventsExchanged++;
            rawPermissionEvents.push({
              benchmark_run_id: runId,
              experiment_id: experimentId,
              condition,
              timestamp: new Date().toISOString(),
              event_type: "PERMISSION_GRANTED",
              actor_id: researcher._id,
              target_user_id: participantA._id,
              role: "EDITOR",
            });

            // Participant B is VIEWER: attempts edit -> server must reject
            simultaneousAttempts++;
            socketB.emit("codeChange", { roomId, code: "// B unauthorized attempt", path: "main.js" });
            eventsExchanged++;
            await new Promise((r) => setTimeout(r, 150));

            // Participant A performs edits
            for (let i = 0; i < 5; i++) {
              const editChunk = `// Edit A chunk ${i + 1}\n`;
              socketA.emit("codeChange", { roomId, code: editChunk, path: "main.js" });
              editsA++;
              totalCodeChanges++;
              charsInserted += editChunk.length;
              linesAdded += 1;
              eventsExchanged++;
              await new Promise((r) => setTimeout(r, 50));
            }

            // Leader revokes A, grants B
            socketRes.emit("revokeEditPermission", { roomId, targetUserId: participantA._id });
            permissionRevocations++;
            eventsExchanged++;
            socketRes.emit("grantEditPermission", { roomId, targetUserId: participantB._id });
            permissionGrants++;
            eventsExchanged++;

            // Participant B performs edits
            for (let i = 0; i < 3; i++) {
              const editChunk = `// Edit B chunk ${i + 1}\n`;
              socketB.emit("codeChange", { roomId, code: editChunk, path: "main.js" });
              editsB++;
              totalCodeChanges++;
              charsInserted += editChunk.length;
              linesAdded += 1;
              eventsExchanged++;
              await new Promise((r) => setTimeout(r, 50));
            }

            timeInViewerStateMs = Math.round(Date.now() - viewerStart);
            timeInEditorStateMs = Math.round(Date.now() - simStartTime);
          } else {
            // AUTOMATED_NORMAL (unrestricted collaboration)
            timeInEditorStateMs = Math.round(Date.now() - simStartTime);
            timeInViewerStateMs = 0;

            // Interleaved concurrent edits by A and B
            for (let i = 0; i < 5; i++) {
              const editA = `// Normal Edit A ${i + 1}\n`;
              socketA.emit("codeChange", { roomId, code: editA, path: "main.js" });
              editsA++;
              totalCodeChanges++;
              charsInserted += editA.length;
              linesAdded += 1;
              eventsExchanged++;

              const editB = `// Normal Edit B ${i + 1}\n`;
              socketB.emit("codeChange", { roomId, code: editB, path: "main.js" });
              editsB++;
              totalCodeChanges++;
              charsInserted += editB.length;
              linesAdded += 1;
              eventsExchanged++;

              await new Promise((r) => setTimeout(r, 40));
            }
          }

          // Submit Task Solution for grading via Piston
          const execStart = Date.now();
          const submitRes = await axios.post(
            `${serverUrl}/api/tasks/${task.taskId}/submit`,
            { submissionCode: task.solutionCode },
            { headers: { Authorization: `Bearer ${pAToken}` } }
          );
          const execLatency = Date.now() - execStart;
          executions++;

          const summary = submitRes.data.summary || {};
          const testsPassed = summary.testsPassed || 0;
          const testsFailed = summary.testsFailed || 0;
          const testsTotal = summary.testsTotal || task.testSuite.expectedTotal;
          const testPassRate = Number(((testsPassed / testsTotal) * 100).toFixed(2));
          const completionStatus = summary.completionStatus || "SUBMITTED";
          const completionTimeSeconds = Math.max(1, Math.round((Date.now() - runStartTs) / 1000));
          const timedOut = completionStatus === "TIME_EXPIRED";

          if (testsFailed === 0) {
            successfulExecutions++;
          } else {
            failedExecutions++;
          }

          // Edit percentages
          const editPctA = totalCodeChanges > 0 ? Number(((editsA / totalCodeChanges) * 100).toFixed(2)) : 0;
          const editPctB = totalCodeChanges > 0 ? Number(((editsB / totalCodeChanges) * 100).toFixed(2)) : 0;

          // Record Raw Task Result
          const taskResultRow = {
            benchmark_run_id: runId,
            experiment_id: experimentId,
            condition,
            task_id: task.taskId,
            task_category: task.category,
            repetition: rep,
            timestamp: new Date().toISOString(),
            completion_status: completionStatus,
            completion_time_seconds: completionTimeSeconds,
            tests_total: testsTotal,
            tests_passed: testsPassed,
            tests_failed: testsFailed,
            test_pass_rate: testPassRate,
            timed_out: timedOut,
            execution_latency_ms: execLatency,
          };
          rawTaskResults.push(taskResultRow);

          // Record Raw Execution Result
          rawExecutionResults.push({
            benchmark_run_id: runId,
            task_id: task.taskId,
            execution_index: 1,
            exit_code: testsFailed === 0 ? 0 : 1,
            execution_status: testsFailed === 0 ? "SUCCESS" : "TEST_FAILURE",
            latency_ms: execLatency,
            tests_passed: testsPassed,
            tests_total: testsTotal,
          });

          // Record Raw Collaboration Run
          const collabRow = {
            benchmark_run_id: runId,
            experiment_id: experimentId,
            condition,
            task_id: task.taskId,
            repetition: rep,
            timestamp: new Date().toISOString(),
            duration_seconds: completionTimeSeconds,
            active_participants: condition === "AUTOMATED_CONTROLLED" ? 3 : 2,
            total_code_changes: totalCodeChanges,
            edits_participant_a: editsA,
            edits_participant_b: editsB,
            edit_pct_participant_a: editPctA,
            edit_pct_participant_b: editPctB,
            characters_inserted: charsInserted,
            characters_deleted: charsDeleted,
            lines_added: linesAdded,
            lines_deleted: linesDeleted,
            executions: executions,
            successful_executions: successfulExecutions,
            failed_executions: failedExecutions,
            permission_grants: permissionGrants,
            permission_revocations: permissionRevocations,
            permission_change_count: permissionGrants + permissionRevocations,
            time_in_viewer_state_ms: timeInViewerStateMs,
            time_in_editor_state_ms: timeInEditorStateMs,
            simultaneous_edit_attempts: simultaneousAttempts,
            rejected_code_changes: permissionDeniedCount,
            permission_denied_code_changes: permissionDeniedCount,
            server_rejected_changes: permissionDeniedCount,
            conflict_rate: "NOT_MEASURABLE",
            conflict_rate_reason: "Single-buffer synchronized architecture does not support merge conflict detection",
            reconnect_count: reconnects,
            disconnect_count: disconnects,
            events_exchanged: eventsExchanged,
            tests_passed: testsPassed,
            tests_total: testsTotal,
            test_pass_rate: testPassRate,
          };
          rawCollaborationRuns.push(collabRow);

          allEvents.push({
            type: "COLLABORATION_RUN_COMPLETED",
            runId,
            condition,
            taskId: task.taskId,
            repetition: rep,
            metrics: collabRow,
          });
        } catch (runErr) {
          console.error(`  [ERROR in ${runId}]:`, runErr.message);
        } finally {
          // Clean disconnect
          if (socketRes && socketRes.connected) socketRes.disconnect();
          if (socketA && socketA.connected) socketA.disconnect();
          if (socketB && socketB.connected) socketB.disconnect();
        }
      }
    }
  }

  console.log(`\n✓ Collaboration Benchmark Completed: ${rawCollaborationRuns.length} runs recorded.`);
  return {
    rawCollaborationRuns,
    rawTaskResults,
    rawExecutionResults,
    rawPermissionEvents,
    allEvents,
  };
}
