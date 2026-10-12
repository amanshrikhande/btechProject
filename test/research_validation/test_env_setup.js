import axios from "axios";
import mongoose from "mongoose";

const BASE_URL = "http://localhost:5000";

export const TEST_USERS = [
  { name: "Researcher Admin", email: "researcher@test.dev", password: "Password123!", role: "researcher" },
  { name: "Participant 1", email: "participant1@test.dev", password: "Password123!", role: "developer" },
  { name: "Participant 2", email: "participant2@test.dev", password: "Password123!", role: "developer" },
  { name: "Participant 3", email: "participant3@test.dev", password: "Password123!", role: "developer" },
  { name: "Participant 4", email: "participant4@test.dev", password: "Password123!", role: "developer" },
];

export async function setupTestEnvironment() {
  console.log("--- Setting up Safe Research Test Environment ---");
  const authResults = {};

  for (const u of TEST_USERS) {
    try {
      // Try login first
      const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: u.email,
        password: u.password,
      });
      // Update role directly in MongoDB to ensure role schema sync
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect("mongodb://127.0.0.1:27017/devshare");
      }
      const User = (await import("../../backend/models/User.js")).User;
      await User.updateOne({ email: u.email }, { $set: { role: u.role } });
      const refreshedUser = await User.findOne({ email: u.email });

      authResults[u.email] = {
        user: {
          id: refreshedUser._id.toString(),
          name: refreshedUser.name,
          email: refreshedUser.email,
          role: refreshedUser.role,
        },
        token: loginRes.data.token,
      };
      console.log(`✓ Logged in test user: ${u.email} (ID: ${refreshedUser._id}, Role: ${refreshedUser.role})`);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404 || err.response?.data?.message?.includes("Invalid credentials")) {
        // Register user
        try {
          const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
            name: u.name,
            email: u.email,
            password: u.password,
            role: u.role,
          });

          if (mongoose.connection.readyState !== 1) {
            await mongoose.connect("mongodb://127.0.0.1:27017/devshare");
          }
          const User = (await import("../../backend/models/User.js")).User;
          await User.updateOne({ email: u.email }, { $set: { role: u.role } });
          const refreshedUser = await User.findOne({ email: u.email });

          authResults[u.email] = {
            user: {
              id: refreshedUser._id.toString(),
              name: refreshedUser.name,
              email: refreshedUser.email,
              role: refreshedUser.role,
            },
            token: regRes.data.token,
          };
          console.log(`✓ Registered new test user: ${u.email} (ID: ${refreshedUser._id}, Role: ${refreshedUser.role})`);
        } catch (regErr) {
          console.error(`✗ Registration failed for ${u.email}:`, regErr.response?.data || regErr.message);
        }
      } else {
        console.error(`✗ Login error for ${u.email}:`, err.response?.data || err.message);
      }
    }
  }

  // Create a Benchmark Research Project owned by Participant 1
  let testProject = null;
  const p1Auth = authResults["participant1@test.dev"];
  if (p1Auth?.token) {
    try {
      const projRes = await axios.post(
        `${BASE_URL}/api/projects`,
        {
          name: "DevShare Research Benchmark Project",
          description: "Target codebase for Controlled Collaboration & RAG validation tests",
          language: "javascript",
          isPublic: true,
        },
        { headers: { Authorization: `Bearer ${p1Auth.token}` } }
      );
      testProject = projRes.data.project || projRes.data.data || projRes.data;
      console.log(`✓ Created Research Test Project: ${testProject._id || testProject.id} ("${testProject.name}")`);

      const projectId = testProject._id || testProject.id;

      // Create test project files for RAG & Execution testing
      const filesToCreate = [
        {
          name: "auth.js",
          path: "/src/auth.js",
          language: "javascript",
          content: `// Authentication module for DevShare Research
export function validateCredentials(email, password) {
  if (!email || !password) return { valid: false, error: "Missing required credentials" };
  if (password.length < 8) return { valid: false, error: "Password must be at least 8 chars" };
  const userRecord = { id: "user_test_99", email, active: true };
  return { valid: true, user: userRecord };
}

export function generateAuthToken(user) {
  return "jwt_token_" + Buffer.from(JSON.stringify(user)).toString("base64");
}
`,
        },
        {
          name: "calculator.js",
          path: "/src/calculator.js",
          language: "javascript",
          content: `// Calculator utility with known edge cases
export function calculateDiscount(price, discountPercent) {
  if (price < 0 || discountPercent < 0) throw new Error("Negative numbers not allowed");
  if (discountPercent > 100) throw new Error("Discount cannot exceed 100%");
  return price - (price * (discountPercent / 100));
}

export function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}
`,
        },
        {
          name: "socketHandler.js",
          path: "/src/socketHandler.js",
          language: "javascript",
          content: `// Socket connection handler
export function setupClientSocket(url, roomId, onMessage) {
  console.log("Connecting Socket.IO to:", url, "for room:", roomId);
  return { connected: true, roomId };
}
`,
        },
      ];

      for (const f of filesToCreate) {
        try {
          await axios.post(
            `${BASE_URL}/api/projects/${projectId}/files`,
            f,
            { headers: { Authorization: `Bearer ${p1Auth.token}` } }
          );
          console.log(`  ✓ Created test project file: ${f.name}`);
        } catch (fErr) {
          // File might already exist
          console.log(`  - File ${f.name} already exists or error:`, fErr.response?.data?.message || fErr.message);
        }
      }
    } catch (pErr) {
      console.error("✗ Failed to create test project:", pErr.response?.data || pErr.message);
    }
  }

  return { authResults, testProject };
}

if (process.argv[1].endsWith("test_env_setup.js")) {
  setupTestEnvironment()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
