// Standardized Programming Tasks Suite for DevShare Research Benchmark
// 10 Reproducible tasks across 10 distinct categories with self-contained Piston test harnesses

export const BENCHMARK_TASKS = [
  // 1. Authentication Validation
  {
    taskId: "TASK-BENCH-01",
    category: "Authentication Validation",
    title: "Validate Credentials & Token Extraction",
    difficulty: "EASY",
    timeLimitMinutes: 10,
    description: "Implement validateCredentials(email, password) and extractBearerToken(authHeader).",
    starterCode: `function validateCredentials(email, password) {
  // TODO: validate email format and password length >= 6
}

function extractBearerToken(authHeader) {
  // TODO: extract token from "Bearer <token>"
}
`,
    solutionCode: `function validateCredentials(email, password) {
  if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) return false;
  if (!password || typeof password !== 'string' || password.length < 6) return false;
  return true;
}

function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

runTest("TEST 1: Valid credentials", () => validateCredentials("user@test.com", "secret123") === true);
runTest("TEST 2: Invalid email without @", () => validateCredentials("invalid-email", "secret123") === false);
runTest("TEST 3: Invalid email without dot", () => validateCredentials("user@domain", "secret123") === false);
runTest("TEST 4: Password too short", () => validateCredentials("user@test.com", "123") === false);
runTest("TEST 5: Empty email", () => validateCredentials("", "secret123") === false);
runTest("TEST 6: Empty password", () => validateCredentials("user@test.com", "") === false);
runTest("TEST 7: Null parameters", () => validateCredentials(null, null) === false);
runTest("TEST 8: Valid Bearer header", () => extractBearerToken("Bearer token_abc_123") === "token_abc_123");
runTest("TEST 9: Basic header rejected", () => extractBearerToken("Basic dXNlcjpwYXNz") === null);
runTest("TEST 10: Empty auth header", () => extractBearerToken("") === null);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 2. CRUD Operation
  {
    taskId: "TASK-BENCH-02",
    category: "CRUD Operation",
    title: "In-Memory Item Repository",
    difficulty: "EASY",
    timeLimitMinutes: 10,
    description: "Implement an in-memory repository supporting create, findById, update, and delete.",
    starterCode: `class ItemRepository {
  constructor() { this.items = new Map(); }
  create(item) {}
  findById(id) {}
  update(id, updates) {}
  delete(id) {}
}
`,
    solutionCode: `class ItemRepository {
  constructor() {
    this.items = new Map();
  }
  create(item) {
    if (!item || !item.id) throw new Error("Item must have an id");
    this.items.set(item.id, { ...item, createdAt: Date.now() });
    return this.items.get(item.id);
  }
  findById(id) {
    return this.items.get(id) || null;
  }
  update(id, updates) {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.items.set(id, updated);
    return updated;
  }
  delete(id) {
    return this.items.delete(id);
  }
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

const repo = new ItemRepository();
runTest("TEST 1: Find non-existent returns null", () => repo.findById("1") === null);
const created = repo.create({ id: "1", name: "Doc1", score: 10 });
runTest("TEST 2: Create item with id", () => created !== null && created.id === "1");
runTest("TEST 3: Find by id after creation", () => repo.findById("1").name === "Doc1");
const updated = repo.update("1", { score: 20 });
runTest("TEST 4: Update item property", () => updated.score === 20);
runTest("TEST 5: Update preserves unchanged", () => repo.findById("1").name === "Doc1");
runTest("TEST 6: Update non-existent returns null", () => repo.update("non-existent", { score: 5 }) === null);
runTest("TEST 7: Delete existing item", () => repo.delete("1") === true);
runTest("TEST 8: Find deleted returns null", () => repo.findById("1") === null);
runTest("TEST 9: Delete again returns false", () => repo.delete("1") === false);
runTest("TEST 10: Create without id throws", () => {
  try { repo.create({ name: "no-id" }); return false; } catch (e) { return true; }
});

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 3. Array / Algorithm Task
  {
    taskId: "TASK-BENCH-03",
    category: "Array/Algorithm Task",
    title: "Sliding Window Maximum & Frequency Ranker",
    difficulty: "MEDIUM",
    timeLimitMinutes: 15,
    description: "Implement maxSlidingWindow(nums, k) and topKFrequent(nums, k).",
    starterCode: `function maxSlidingWindow(nums, k) {}
function topKFrequent(nums, k) {}
`,
    solutionCode: `function maxSlidingWindow(nums, k) {
  if (!nums || nums.length === 0 || k <= 0) return [];
  const result = [];
  for (let i = 0; i <= nums.length - k; i++) {
    let max = nums[i];
    for (let j = 1; j < k; j++) {
      if (nums[i + j] > max) max = nums[i + j];
    }
    result.push(max);
  }
  return result;
}

function topKFrequent(nums, k) {
  if (!nums || nums.length === 0) return [];
  const map = new Map();
  for (const n of nums) map.set(n, (map.get(n) || 0) + 1);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(e => e[0]);
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

runTest("TEST 1: Sliding window size 3", () => JSON.stringify(maxSlidingWindow([1,3,-1,-3,5,3,6,7], 3)) === JSON.stringify([3,3,5,5,6,7]));
runTest("TEST 2: Single element window", () => JSON.stringify(maxSlidingWindow([1], 1)) === JSON.stringify([1]));
runTest("TEST 3: Empty array window", () => JSON.stringify(maxSlidingWindow([], 2)) === JSON.stringify([]));
runTest("TEST 4: Window equals length", () => JSON.stringify(maxSlidingWindow([9, 11], 2)) === JSON.stringify([11]));
runTest("TEST 5: Negative numbers in window", () => JSON.stringify(maxSlidingWindow([4,-2], 2)) === JSON.stringify([4]));
runTest("TEST 6: Top 2 frequent items", () => JSON.stringify(topKFrequent([1,1,1,2,2,3], 2)) === JSON.stringify([1,2]));
runTest("TEST 7: Top 1 single item", () => JSON.stringify(topKFrequent([1], 1)) === JSON.stringify([1]));
runTest("TEST 8: All identical items", () => JSON.stringify(topKFrequent([4,4,4,4], 1)) === JSON.stringify([4]));
runTest("TEST 9: Empty array top k", () => JSON.stringify(topKFrequent([], 2)) === JSON.stringify([]));
runTest("TEST 10: Equal frequencies", () => topKFrequent([1,2,3], 3).length === 3);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 4. String Processing
  {
    taskId: "TASK-BENCH-04",
    category: "String Processing",
    title: "Markdown Code Block Parser",
    difficulty: "EASY",
    timeLimitMinutes: 10,
    description: "Extract language and code contents from markdown fenced code blocks.",
    starterCode: `function parseCodeBlocks(markdown) {}
`,
    solutionCode: `function parseCodeBlocks(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  const regex = /\`\`\`([a-zA-Z0-9_-]*)\\r?\\n([\\s\\S]*?)\`\`\`/g;
  const blocks = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'plaintext',
      code: match[2].trimEnd()
    });
  }
  return blocks;
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

runTest("TEST 1: Empty string returns empty", () => parseCodeBlocks("").length === 0);
runTest("TEST 2: Null string returns empty", () => parseCodeBlocks(null).length === 0);
const res1 = parseCodeBlocks("\`\`\`javascript\\nconsole.log(42);\\n\`\`\`");
runTest("TEST 3: Single block count", () => res1.length === 1);
runTest("TEST 4: Single block language", () => res1[0]?.language === "javascript");
runTest("TEST 5: Single block code", () => res1[0]?.code === "console.log(42);");
const res2 = parseCodeBlocks("before\\n\`\`\`python\\nprint(1)\\n\`\`\`\\n\`\`\`json\\n{}\\n\`\`\`");
runTest("TEST 6: Multi blocks count", () => res2.length === 2);
runTest("TEST 7: First block python", () => res2[0]?.language === "python");
runTest("TEST 8: Second block json", () => res2[1]?.language === "json");
const res3 = parseCodeBlocks("\`\`\`\\ntext\\n\`\`\`");
runTest("TEST 9: Default plaintext", () => res3[0]?.language === "plaintext");
runTest("TEST 10: Plaintext content", () => res3[0]?.code === "text");

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 5. API Endpoint Implementation
  {
    taskId: "TASK-BENCH-05",
    category: "API Endpoint Implementation",
    title: "Lightweight Request Router",
    difficulty: "MEDIUM",
    timeLimitMinutes: 15,
    description: "Implement a URL route matching dispatcher supporting parameterized routes like /users/:id.",
    starterCode: `class MiniRouter {
  constructor() { this.routes = []; }
  get(path, handler) {}
  post(path, handler) {}
  dispatch(method, url) {}
}
`,
    solutionCode: `class MiniRouter {
  constructor() {
    this.routes = [];
  }
  get(path, handler) { this.addRoute('GET', path, handler); }
  post(path, handler) { this.addRoute('POST', path, handler); }
  addRoute(method, path, handler) {
    const paramNames = [];
    const patternStr = '^' + path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) + '$';
    this.routes.push({ method, regex: new RegExp(patternStr), paramNames, handler });
  }
  dispatch(method, url) {
    for (const route of this.routes) {
      if (route.method === method) {
        const match = url.match(route.regex);
        if (match) {
          const params = {};
          route.paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
          return { found: true, result: route.handler(params) };
        }
      }
    }
    return { found: false, error: "404 Not Found" };
  }
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

const router = new MiniRouter();
router.get("/health", () => "OK");
router.get("/users/:id", (p) => \`User:\${p.id}\`);
router.post("/items", () => "ItemCreated");
router.get("/projects/:pid/files/:fid", (p) => \`P:\${p.pid},F:\${p.fid}\`);

runTest("TEST 1: Exact GET match", () => router.dispatch("GET", "/health").result === "OK");
runTest("TEST 2: Method mismatch", () => router.dispatch("POST", "/health").found === false);
runTest("TEST 3: Number param route", () => router.dispatch("GET", "/users/42").result === "User:42");
runTest("TEST 4: String param route", () => router.dispatch("GET", "/users/abc").result === "User:abc");
runTest("TEST 5: Exact POST match", () => router.dispatch("POST", "/items").result === "ItemCreated");
runTest("TEST 6: GET on POST route", () => router.dispatch("GET", "/items").found === false);
runTest("TEST 7: Multi-param route", () => router.dispatch("GET", "/projects/p1/files/f2").result === "P:p1,F:f2");
runTest("TEST 8: Unknown route 404", () => router.dispatch("GET", "/unknown").found === false);
runTest("TEST 9: Trailing path no match", () => router.dispatch("GET", "/users/42/extra").found === false);
runTest("TEST 10: Missing param no match", () => router.dispatch("GET", "/users").found === false);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 6. Database Query Filter
  {
    taskId: "TASK-BENCH-06",
    category: "Database Query Task",
    title: "Predicate Query Evaluator",
    difficulty: "MEDIUM",
    timeLimitMinutes: 15,
    description: "Evaluate MongoDB-style filter objects ($eq, $gt, $in, $ne) against memory records.",
    starterCode: `function filterRecords(records, query) {}
`,
    solutionCode: `function filterRecords(records, query) {
  if (!records || !Array.isArray(records)) return [];
  if (!query || Object.keys(query).length === 0) return [...records];

  return records.filter(record => {
    for (const [key, condition] of Object.entries(query)) {
      const val = record[key];
      if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
        if ('$eq' in condition && val !== condition.$eq) return false;
        if ('$ne' in condition && val === condition.$ne) return false;
        if ('$gt' in condition && !(val > condition.$gt)) return false;
        if ('$gte' in condition && !(val >= condition.$gte)) return false;
        if ('$lt' in condition && !(val < condition.$lt)) return false;
        if ('$in' in condition && (!Array.isArray(condition.$in) || !condition.$in.includes(val))) return false;
      } else {
        if (val !== condition) return false;
      }
    }
    return true;
  });
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

const data = [
  { id: 1, role: 'admin', age: 30, active: true },
  { id: 2, role: 'researcher', age: 25, active: true },
  { id: 3, role: 'developer', age: 22, active: false },
  { id: 4, role: 'developer', age: 35, active: true },
];

runTest("TEST 1: Empty query returns all", () => filterRecords(data, {}).length === 4);
runTest("TEST 2: Property equality match", () => filterRecords(data, { role: 'admin' }).length === 1);
runTest("TEST 3: $eq match", () => filterRecords(data, { role: { $eq: 'developer' } }).length === 2);
runTest("TEST 4: $gt match", () => filterRecords(data, { age: { $gt: 25 } }).length === 2);
runTest("TEST 5: $gte match", () => filterRecords(data, { age: { $gte: 25 } }).length === 3);
runTest("TEST 6: $lt match", () => filterRecords(data, { age: { $lt: 25 } }).length === 1);
runTest("TEST 7: $in match", () => filterRecords(data, { role: { $in: ['admin', 'researcher'] } }).length === 2);
runTest("TEST 8: $ne match", () => filterRecords(data, { role: { $ne: 'developer' } }).length === 2);
runTest("TEST 9: Compound equality", () => filterRecords(data, { role: 'developer', active: true }).length === 1);
runTest("TEST 10: Null data returns empty", () => filterRecords(null, {}).length === 0);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 7. Bug Fixing
  {
    taskId: "TASK-BENCH-07",
    category: "Bug Fixing",
    title: "Fix Token Bucket Rate Limiter",
    difficulty: "MEDIUM",
    timeLimitMinutes: 15,
    description: "Fix calculation bugs in TokenBucketRateLimiter (refill rate, capacity cap, consume logic).",
    starterCode: `class TokenBucket {
  constructor(capacity, refillRatePerSec) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  consume(tokens = 1) {
    if (this.tokens >= tokens) { this.tokens -= tokens; return true; }
    return false;
  }
}
`,
    solutionCode: `class TokenBucket {
  constructor(capacity, refillRatePerSec) {
    this.capacity = Math.max(0, capacity);
    this.refillRate = Math.max(0, refillRatePerSec);
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
  refill(now = Date.now()) {
    const elapsedSec = (now - this.lastRefill) / 1000;
    if (elapsedSec > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRate);
      this.lastRefill = now;
    }
  }
  consume(count = 1, now = Date.now()) {
    if (count <= 0) return true;
    this.refill(now);
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

const t0 = 1000000;
const bucket = new TokenBucket(10, 2);
runTest("TEST 1: Consume initial 5", () => bucket.consume(5, t0) === true);
runTest("TEST 2: Consume remaining 5", () => bucket.consume(5, t0) === true);
runTest("TEST 3: Reject when empty", () => bucket.consume(1, t0) === false);
runTest("TEST 4: Consume 0 always true", () => bucket.consume(0, t0) === true);
runTest("TEST 5: Consume 4 after 2s", () => bucket.consume(4, t0 + 2000) === true);
runTest("TEST 6: Depleted after consuming 4", () => bucket.consume(1, t0 + 2000) === false);
runTest("TEST 7: Caps at capacity 10", () => bucket.consume(10, t0 + 102000) === true);
runTest("TEST 8: Cannot exceed capacity", () => bucket.consume(1, t0 + 102000) === false);
const emptyBucket = new TokenBucket(0, 1);
runTest("TEST 9: Zero capacity never grants", () => emptyBucket.consume(1, t0) === false);
runTest("TEST 10: Zero capacity grants 0", () => emptyBucket.consume(0, t0) === true);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 8. Data Validation
  {
    taskId: "TASK-BENCH-08",
    category: "Data Validation",
    title: "JSON Schema Validator for Research Submissions",
    difficulty: "EASY",
    timeLimitMinutes: 10,
    description: "Validate research task submissions against required fields, types, and constraints.",
    starterCode: `function validateTaskSubmission(payload) {}
`,
    solutionCode: `function validateTaskSubmission(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be an object'] };
  }
  if (!payload.experimentId || typeof payload.experimentId !== 'string') {
    errors.push('experimentId is required and must be a string');
  }
  if (!payload.taskId || typeof payload.taskId !== 'string') {
    errors.push('taskId is required and must be a string');
  }
  if (!['NORMAL', 'CONTROLLED', 'STANDALONE'].includes(payload.condition)) {
    errors.push('condition must be one of: NORMAL, CONTROLLED, STANDALONE');
  }
  if (typeof payload.submissionCode !== 'string' || payload.submissionCode.trim().length === 0) {
    errors.push('submissionCode must be a non-empty string');
  }
  return { valid: errors.length === 0, errors };
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

const validPayload = { experimentId: 'EXP-1', taskId: 'TASK-1', condition: 'NORMAL', submissionCode: 'const x = 1;' };
runTest("TEST 1: Valid payload passes", () => validateTaskSubmission(validPayload).valid === true);
runTest("TEST 2: Null payload fails", () => validateTaskSubmission(null).valid === false);
runTest("TEST 3: Empty experimentId fails", () => validateTaskSubmission({ ...validPayload, experimentId: '' }).valid === false);
runTest("TEST 4: Non-string taskId fails", () => validateTaskSubmission({ ...validPayload, taskId: 123 }).valid === false);
runTest("TEST 5: Invalid condition fails", () => validateTaskSubmission({ ...validPayload, condition: 'INVALID' }).valid === false);
runTest("TEST 6: CONTROLLED passes", () => validateTaskSubmission({ ...validPayload, condition: 'CONTROLLED' }).valid === true);
runTest("TEST 7: STANDALONE passes", () => validateTaskSubmission({ ...validPayload, condition: 'STANDALONE' }).valid === true);
runTest("TEST 8: Empty code fails", () => validateTaskSubmission({ ...validPayload, submissionCode: '' }).valid === false);
runTest("TEST 9: Whitespace code fails", () => validateTaskSubmission({ ...validPayload, submissionCode: '   ' }).valid === false);
runTest("TEST 10: Collects multiple errors", () => validateTaskSubmission({ experimentId: 1, taskId: null, condition: 'BAD', submissionCode: '' }).errors.length >= 4);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 9. File Processing Task
  {
    taskId: "TASK-BENCH-09",
    category: "File-processing Task",
    title: "Virtual File Tree Scanner & Aggregator",
    difficulty: "MEDIUM",
    timeLimitMinutes: 15,
    description: "Traverse a virtual project file tree, calculate extension frequencies, and find file paths.",
    starterCode: `function scanFileTree(rootNode) {}
`,
    solutionCode: `function scanFileTree(rootNode) {
  if (!rootNode) return { totalFiles: 0, totalBytes: 0, extensions: {}, files: [] };
  let totalFiles = 0;
  let totalBytes = 0;
  const extensions = {};
  const files = [];

  function traverse(node, currentPath) {
    const fullPath = currentPath ? \`\${currentPath}/\${node.name}\` : node.name;
    if (node.type === 'file') {
      totalFiles++;
      const size = node.size || 0;
      totalBytes += size;
      const ext = node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : 'none';
      extensions[ext] = (extensions[ext] || 0) + 1;
      files.push({ path: fullPath, size, ext });
    } else if (node.type === 'directory' && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child, fullPath);
      }
    }
  }

  traverse(rootNode, '');
  return { totalFiles, totalBytes, extensions, files };
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

runTest("TEST 1: Null root returns 0 files", () => scanFileTree(null).totalFiles === 0);
const tree = {
  name: 'src',
  type: 'directory',
  children: [
    { name: 'index.js', type: 'file', size: 100 },
    { name: 'styles.css', type: 'file', size: 250 },
    {
      name: 'utils',
      type: 'directory',
      children: [
        { name: 'auth.js', type: 'file', size: 300 },
        { name: 'readme', type: 'file', size: 50 },
      ]
    }
  ]
};

const result = scanFileTree(tree);
runTest("TEST 2: Total files count", () => result.totalFiles === 4);
runTest("TEST 3: Total bytes count", () => result.totalBytes === 700);
runTest("TEST 4: Count JS extensions", () => result.extensions.js === 2);
runTest("TEST 5: Count CSS extensions", () => result.extensions.css === 1);
runTest("TEST 6: Count none extensions", () => result.extensions.none === 1);
runTest("TEST 7: Nested path resolved", () => result.files.some(f => f.path === 'src/utils/auth.js'));
runTest("TEST 8: Root path resolved", () => result.files.some(f => f.path === 'src/index.js'));
runTest("TEST 9: Empty dir returns 0", () => scanFileTree({ name: 'emptyDir', type: 'directory', children: [] }).totalFiles === 0);
runTest("TEST 10: Single file root", () => scanFileTree({ name: 'file.txt', type: 'file', size: 12 }).totalFiles === 1);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  },

  // 10. Multi-Function Integration Task
  {
    taskId: "TASK-BENCH-10",
    category: "Multi-Function Integration Task",
    title: "Collaborative Session Telemetry Aggregator",
    difficulty: "HARD",
    timeLimitMinutes: 20,
    description: "Compute participant edit percentages, session duration, and active editor transitions.",
    starterCode: `function aggregateSessionTelemetry(events) {}
`,
    solutionCode: `function aggregateSessionTelemetry(events) {
  if (!events || !Array.isArray(events) || events.length === 0) {
    return { durationSeconds: 0, totalEdits: 0, editPercentages: {}, roleChanges: 0, participantCount: 0 };
  }

  const participants = new Set();
  const editsByUser = {};
  let totalEdits = 0;
  let roleChanges = 0;
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const ev of events) {
    const ts = new Date(ev.timestamp).getTime();
    if (!isNaN(ts)) {
      if (ts < minTime) minTime = ts;
      if (ts > maxTime) maxTime = ts;
    }

    if (ev.userId) participants.add(ev.userId);

    if (ev.eventType === 'CODE_EDIT') {
      totalEdits++;
      editsByUser[ev.userId] = (editsByUser[ev.userId] || 0) + 1;
    }

    if (['EDIT_PERMISSION_GRANTED', 'EDIT_PERMISSION_REVOKED', 'ROLE_CHANGED'].includes(ev.eventType)) {
      roleChanges++;
    }
  }

  const durationSeconds = (minTime !== Infinity && maxTime !== -Infinity) ? Math.max(0, Math.round((maxTime - minTime) / 1000)) : 0;
  const editPercentages = {};
  for (const [userId, count] of Object.entries(editsByUser)) {
    editPercentages[userId] = totalEdits > 0 ? Number(((count / totalEdits) * 100).toFixed(1)) : 0;
  }

  return {
    durationSeconds,
    totalEdits,
    editPercentages,
    roleChanges,
    participantCount: participants.size
  };
}
`,
    testSuite: {
      language: "javascript",
      expectedTotal: 10,
      testCode: `
const testResults = [];
function runTest(name, fn) {
  try {
    const passed = fn();
    testResults.push({ name, status: passed ? "PASS" : "FAIL" });
  } catch (e) {
    testResults.push({ name, status: "FAIL", error: e.message });
  }
}

runTest("TEST 1: Empty events returns 0", () => aggregateSessionTelemetry([]).totalEdits === 0);
runTest("TEST 2: Null events returns 0", () => aggregateSessionTelemetry(null).durationSeconds === 0);

const t0 = new Date("2026-09-20T10:00:00Z");
const t1 = new Date("2026-09-20T10:01:00Z");
const mockEvents = [
  { eventType: 'USER_JOINED', userId: 'u1', timestamp: t0 },
  { eventType: 'USER_JOINED', userId: 'u2', timestamp: t0 },
  { eventType: 'CODE_EDIT', userId: 'u1', timestamp: t0 },
  { eventType: 'CODE_EDIT', userId: 'u1', timestamp: t0 },
  { eventType: 'CODE_EDIT', userId: 'u1', timestamp: t0 },
  { eventType: 'CODE_EDIT', userId: 'u2', timestamp: t1 },
  { eventType: 'EDIT_PERMISSION_GRANTED', userId: 'u2', timestamp: t1 },
];

const agg = aggregateSessionTelemetry(mockEvents);
runTest("TEST 3: Participant count", () => agg.participantCount === 2);
runTest("TEST 4: Duration seconds", () => agg.durationSeconds === 60);
runTest("TEST 5: Total edits count", () => agg.totalEdits === 4);
runTest("TEST 6: U1 edit percentage", () => agg.editPercentages['u1'] === 75.0);
runTest("TEST 7: U2 edit percentage", () => agg.editPercentages['u2'] === 25.0);
runTest("TEST 8: Role changes count", () => agg.roleChanges === 1);
runTest("TEST 9: Single edit 100%", () => aggregateSessionTelemetry([{ eventType: 'CODE_EDIT', userId: 'uA', timestamp: t0 }]).editPercentages['uA'] === 100.0);
runTest("TEST 10: Single edit 0s duration", () => aggregateSessionTelemetry([{ eventType: 'CODE_EDIT', userId: 'uA', timestamp: t0 }]).durationSeconds === 0);

const passed = testResults.filter(t => t.status === "PASS").length;
const failed = testResults.filter(t => t.status === "FAIL").length;
console.log(JSON.stringify({ total: testResults.length, passed, failed, successRate: passed / testResults.length }));
`
    }
  }
];
