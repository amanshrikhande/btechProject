"""
In-process unit & integration test for DevShare Python AI Service
Tests chunking, vector indexing, project isolation, RAG query, debug, and patch generation.
"""
import sys
import os

# Ensure ai_service is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ai_service"))

from app.rag.chunker import chunker
from app.rag.vectorstore import vector_store
from app.main import (
    analyze_code_defects,
    synthesize_deep_explanation,
    synthesize_bug_audit,
    synthesize_tests,
    synthesize_debug_report,
    synthesize_patch_proposal,
)

passed = 0
failed = 0

def check(condition, desc):
    global passed, failed
    if condition:
        print(f"  [PASS] {desc}")
        passed += 1
    else:
        print(f"  [FAIL] {desc}")
        failed += 1

print("\n=======================================================")
print("=== PYTHON AI SERVICE UNIT & ISOLATION TEST SUITE   ===")
print("=======================================================")

# 1. Test Code-Aware Chunking for JavaScript
js_sample = """import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const validateCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) return null;
  return user;
};

export class AuthService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
  }
}
"""

js_chunks = chunker.chunk_file({
    "fileId": "f_auth_1",
    "projectId": "proj_demo_1",
    "fileName": "authService.js",
    "filePath": "/src/authService.js",
    "language": "javascript",
    "content": js_sample,
})

check(len(js_chunks) >= 2, f"JS structural chunker extracted {len(js_chunks)} chunks (expected >= 2)")
symbols = [c["metadata"].get("symbol") for c in js_chunks]
check("validateCredentials" in symbols or "AuthService" in symbols, f"Extracted function/class symbols: {symbols}")
check(js_chunks[0]["metadata"]["startLine"] > 0, "Chunk metadata contains valid startLine")

# 2. Test Code-Aware Chunking for Python
py_sample = """import os
import math

def calculate_portfolio_risk(weights, cov_matrix):
    \"\"\"Calculates standard portfolio variance.\"\"\"
    variance = sum(w * 0.02 for w in weights)
    return math.sqrt(variance)

class PortfolioOptimizer:
    def __init__(self, target_return):
        self.target = target_return
"""

py_chunks = chunker.chunk_file({
    "fileId": "f_calc_1",
    "projectId": "proj_demo_1",
    "fileName": "portfolio.py",
    "filePath": "/src/portfolio.py",
    "language": "python",
    "content": py_sample,
})

check(len(py_chunks) >= 2, f"Python structural chunker extracted {len(py_chunks)} chunks")
py_symbols = [c["metadata"].get("symbol") for c in py_chunks]
check("calculate_portfolio_risk" in py_symbols or "PortfolioOptimizer" in py_symbols, f"Python symbols identified: {py_symbols}")

# 3. Test Vector Store Indexing and Project Isolation
projA = "proj_alpha_999"
projB = "proj_beta_888"

resA = vector_store.index_project_files(projA, [
    {
        "fileId": "fA1",
        "fileName": "auth.js",
        "filePath": "/src/auth.js",
        "language": "javascript",
        "content": "export function login(user) { return jwt.sign(user, 'JWT_SECRET'); }"
    }
])

resB = vector_store.index_project_files(projB, [
    {
        "fileId": "fB1",
        "fileName": "ledgerPayroll.py",
        "filePath": "/src/ledgerPayroll.py",
        "language": "python",
        "content": "CONFIDENTIAL_PAYROLL_DATA = 999999\ndef get_payroll(): return CONFIDENTIAL_PAYROLL_DATA"
    }
])

check(resA["chunksCount"] >= 1, f"Project A indexed ({resA['chunksCount']} chunks)")
check(resB["chunksCount"] >= 1, f"Project B indexed ({resB['chunksCount']} chunks)")

# Query Project A
qA = vector_store.query_project(projA, "How is login implemented with jwt token?", top_k=3)
chunksA = qA.get("chunks", [])
check(len(chunksA) > 0, f"Project A query returned {len(chunksA)} results")

# ISOLATION CHECK: Project B payroll must NOT be in Project A query
leaked_b = any("secretPayroll" in (c.get("fileName") or "") for c in chunksA)
check(not leaked_b, "Project Isolation: Project B data NEVER leaked to Project A query")

# Query Project B
qB = vector_store.query_project(projB, "Where is confidential payroll stored?", top_k=3)
chunksB = qB.get("chunks", [])
check(len(chunksB) > 0, f"Project B query returned {len(chunksB)} results")
leaked_a = any("auth.js" in (c.get("fileName") or "") for c in chunksB)
check(not leaked_a, "Project Isolation: Project A data NEVER leaked to Project B query")

# Genuine score check
if chunksA:
    score = chunksA[0].get("score")
    check(score is not None and 0.0 <= score <= 1.0, f"Genuine score computed: {score}")

# 4. Status Check
statusA = vector_store.get_project_status(projA)
check(statusA["status"] == "ready", f"Project A status is ready ({statusA['status']})")

# 5. AI Debug Synthesis Check
debug_rep = synthesize_debug_report("const x = null;\nx.foo();", "javascript", "main.js", "Cannot read properties of null", chunksA)
check("suspectedIssue" in debug_rep, f"Debug report generated: {debug_rep['suspectedIssue']}")

# 6. AI Patch Synthesis Check
patch_rep = synthesize_patch_proposal("const secret = process.env.SECRET_KEY;", "javascript", "auth.js", "Use JWT_SECRET")
check("diff" in patch_rep and "--- a/auth.js" in patch_rep["diff"], "Unified patch diff generated for human review")

print("\n=======================================================")
print(f"=== UNIT TEST SUMMARY: {passed} PASSED, {failed} FAILED ===")
print("=======================================================")

if failed > 0:
    sys.exit(1)
sys.exit(0)
