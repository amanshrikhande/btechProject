"""
DevShare Model Benchmark: qwen2.5-coder:1.5b vs qwen2.5-coder:7b
Engineering Evaluation under Identical Conditions:
- Same repository: 3 files (linked_list.py, auth.service.py, calculator.py)
- Same retrieval pipeline & evidence
- Same system prompt & JSON schema
- Same 30 questions across 5 categories
- Same EvidenceValidator
- Strict metric definitions:
    * Grounding Precision = validated repository-specific claims / total repository-specific claims
    * Validator Rejection Rate = rejected claims / total claims
    * Evidence Citation Accuracy = valid citations / total citations
    * Latency: Mean, Median, P95
    * Prompt Tokens & Completion Tokens
- Generates human evaluation dataset for human evaluators with 0-2 rubrics
"""

import os
import sys
import json
import time
import uuid
import statistics
import requests

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
_AI_ROOT = os.path.join(_ROOT, "ai_service")
if _AI_ROOT not in sys.path:
    sys.path.insert(0, _AI_ROOT)

from ai_service.app.intelligence.evidence_validator import (
    EvidenceValidator,
    build_canonical_evidence,
    create_evidence_manifest,
)

OLLAMA_URL = "http://127.0.0.1:11434"

# ---------------------------------------------------------------------------
# 1. Standardized Repository Source Files
# ---------------------------------------------------------------------------
REPO_FILES = [
    {
        "fileId": "file_linked_list_01",
        "filePath": "/src/data_structures/linked_list.py",
        "fileName": "linked_list.py",
        "language": "python",
        "content": """class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        last = self.head
        while last.next:
            last = last.next
        last.next = new_node

    def reverse(self):
        prev = None
        current = self.head
        while current:
            nxt = current.next
            current.next = prev
            prev = current
            current = nxt
        self.head = prev
""",
    },
    {
        "fileId": "file_auth_service_02",
        "filePath": "/src/services/auth.service.py",
        "fileName": "auth.service.py",
        "language": "python",
        "content": """import jwt
import bcrypt
import datetime

class AuthService:
    def __init__(self, secret_key):
        self.secret_key = secret_key

    def verify_password(self, plain_password, hashed_password):
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def generate_token(self, user_id):
        payload = {
            "user_id": user_id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        return jwt.encode(payload, self.secret_key, algorithm="HS256")
""",
    },
    {
        "fileId": "file_calculator_03",
        "filePath": "/src/utils/calculator.py",
        "fileName": "calculator.py",
        "language": "python",
        "content": """def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def divide(a, b):
    # Potential ZeroDivisionError if b == 0
    return a / b
""",
    }
]

# ---------------------------------------------------------------------------
# 2. 30 Standardized Benchmark Questions across 5 Categories
# ---------------------------------------------------------------------------
BENCHMARK_QUESTIONS = [
    # Category 1: Code Explanation (Q1-Q6)
    {"id": "Q01", "cat": "EXPLANATION", "query": "What is the purpose of the Node class in linked_list.py?", "targetFile": "linked_list.py"},
    {"id": "Q02", "cat": "EXPLANATION", "query": "Explain how LinkedList.reverse() reverses the linked list.", "targetFile": "linked_list.py"},
    {"id": "Q03", "cat": "EXPLANATION", "query": "What does LinkedList.append() do when the list is initially empty?", "targetFile": "linked_list.py"},
    {"id": "Q04", "cat": "EXPLANATION", "query": "Explain how verify_password works in auth.service.py.", "targetFile": "auth.service.py"},
    {"id": "Q05", "cat": "EXPLANATION", "query": "What payload and expiration are encoded in generate_token in auth.service.py?", "targetFile": "auth.service.py"},
    {"id": "Q06", "cat": "EXPLANATION", "query": "Explain what the divide function does in calculator.py.", "targetFile": "calculator.py"},

    # Category 2: Logic Bug & Edge Case Detection (Q7-Q12)
    {"id": "Q07", "cat": "BUG_DETECTION", "query": "Is there a bug or potential exception in calculator.py divide function when b is 0?", "targetFile": "calculator.py"},
    {"id": "Q08", "cat": "BUG_DETECTION", "query": "What happens in LinkedList.reverse if self.head is None?", "targetFile": "linked_list.py"},
    {"id": "Q09", "cat": "BUG_DETECTION", "query": "Does verify_password handle missing or empty password strings safely?", "targetFile": "auth.service.py"},
    {"id": "Q10", "cat": "BUG_DETECTION", "query": "Does generate_token check if secret_key is null before encoding?", "targetFile": "auth.service.py"},
    {"id": "Q11", "cat": "BUG_DETECTION", "query": "Does LinkedList.append handle circular references?", "targetFile": "linked_list.py"},
    {"id": "Q12", "cat": "BUG_DETECTION", "query": "Does calculator.py handle overflow for very large integers in multiply?", "targetFile": "calculator.py"},

    # Category 3: Deterministic Syntax & Static Hazard Verification (Q13-Q18)
    {"id": "Q13", "cat": "SYNTAX_ANALYSIS", "query": "Are there any syntax errors in calculator.py?", "targetFile": "calculator.py"},
    {"id": "Q14", "cat": "SYNTAX_ANALYSIS", "query": "Are there any missing imports in linked_list.py?", "targetFile": "linked_list.py"},
    {"id": "Q15", "cat": "SYNTAX_ANALYSIS", "query": "What libraries are imported at the top of auth.service.py?", "targetFile": "auth.service.py"},
    {"id": "Q16", "cat": "SYNTAX_ANALYSIS", "query": "Is there any dead or unreachable code in LinkedList.reverse?", "targetFile": "linked_list.py"},
    {"id": "Q17", "cat": "SYNTAX_ANALYSIS", "query": "Does calculator.py define any global variables or classes?", "targetFile": "calculator.py"},
    {"id": "Q18", "cat": "SYNTAX_ANALYSIS", "query": "Check if Node.__init__ has valid Python syntax and arguments.", "targetFile": "linked_list.py"},

    # Category 4: Context Contamination & Phantom Entity Probes (Q19-Q24)
    {"id": "Q19", "cat": "CONTAMINATION_PROBE", "query": "How is Redis configured for session caching in this repository?", "targetFile": "auth.service.py"},
    {"id": "Q20", "cat": "CONTAMINATION_PROBE", "query": "Where is PaymentService located and how does it process transactions?", "targetFile": "calculator.py"},
    {"id": "Q21", "cat": "CONTAMINATION_PROBE", "query": "What database schema does UserRepository use?", "targetFile": "auth.service.py"},
    {"id": "Q22", "cat": "CONTAMINATION_PROBE", "query": "Does AuthService use MongoDB for token blacklisting?", "targetFile": "auth.service.py"},
    {"id": "Q23", "cat": "CONTAMINATION_PROBE", "query": "Explain the Stripe webhook handler in payment.controller.js", "targetFile": "calculator.py"},
    {"id": "Q24", "cat": "CONTAMINATION_PROBE", "query": "What port does the authentication microservice listen on?", "targetFile": "auth.service.py"},

    # Category 5: Cross-Entity Grounding & Retrieval Verification (Q25-Q30)
    {"id": "Q25", "cat": "GROUNDING_RETRIEVAL", "query": "Where is Node defined and which methods create Node instances?", "targetFile": "linked_list.py"},
    {"id": "Q26", "cat": "GROUNDING_RETRIEVAL", "query": "Which file contains password hashing and token generation logic?", "targetFile": "auth.service.py"},
    {"id": "Q27", "cat": "GROUNDING_RETRIEVAL", "query": "List all arithmetic functions provided in calculator.py.", "targetFile": "calculator.py"},
    {"id": "Q28", "cat": "GROUNDING_RETRIEVAL", "query": "What methods does the LinkedList class expose?", "targetFile": "linked_list.py"},
    {"id": "Q29", "cat": "GROUNDING_RETRIEVAL", "query": "What cryptographic algorithm is used in generate_token?", "targetFile": "auth.service.py"},
    {"id": "Q30", "cat": "GROUNDING_RETRIEVAL", "query": "What arguments does calculator.divide accept and what does it return?", "targetFile": "calculator.py"},
]

def build_canonical_evidence_for_file(f):
    lines = f["content"].strip().split("\n")
    return build_canonical_evidence({
        "fileId": f["fileId"],
        "filePath": f["filePath"],
        "fileName": f["fileName"],
        "language": f["language"],
        "startLine": 1,
        "endLine": len(lines),
        "snippet": f["content"],
        "symbol": "module",
        "retrievalSource": "exact_file",
        "score": 1.0,
    })

def build_prompt_for_query(q_item, canonical_evidence):
    target_f = next((f for f in REPO_FILES if f["fileName"] == q_item["targetFile"]), REPO_FILES[0])
    
    # Context sections strictly conforming to Requirement 7
    evidence_blocks = ["=== PROJECT EVIDENCE ==="]
    for ev in canonical_evidence:
        evidence_blocks.append(
            f"FILE: `{ev['filePath']}` (Lines {ev['startLine']}-{ev['endLine']})\n"
            f"```{ev['language']}\n{ev['snippet']}\n```"
        )
    evidence_blocks.append("\n[ANALYZER SIGNALS]: No deterministic syntax errors flagged.")

    unsaved_blocks = ["=== UNSAVED BUFFER ===", "No separate unsaved buffer."]
    query_blocks = ["=== USER QUERY ===", q_item["query"]]
    
    # Add heavily contaminated conversation context for Category 4 to probe robustness
    history_blocks = ["=== OPTIONAL CONVERSATION CONTEXT ==="]
    if q_item["cat"] == "CONTAMINATION_PROBE":
        history_blocks.append("[USER]: We need to configure Redis for AuthService and connect PaymentService to Stripe.")
        history_blocks.append("[ASSISTANT]: AuthService usually stores tokens in Redis and UserRepository handles database calls.")
        history_blocks.append("NOTE: CONVERSATION_CONTEXT is NOT repository evidence. Do NOT treat entities mentioned in past chat as current repository facts.")
    else:
        history_blocks.append("No prior conversation context.")

    full_context = "\n\n".join([
        "\n".join(evidence_blocks),
        "\n".join(unsaved_blocks),
        "\n".join(query_blocks),
        "\n".join(history_blocks)
    ])

    system_prompt = (
        "=== SYSTEM INSTRUCTIONS ===\n"
        "You are DevShare's project-aware code analysis engine.\n"
        "ONLY PROJECT_EVIDENCE may establish repository facts.\n"
        "UNSAVED_BUFFER may be discussed only as unsaved code.\n"
        "CONVERSATION_CONTEXT is NOT repository evidence.\n\n"
        "GROUNDING RULES:\n"
        "1. Use ONLY the supplied PROJECT EVIDENCE when making claims about project files, functions, classes, modules, APIs, routes, databases, variables, dependencies, or behavior.\n"
        "2. NEVER invent files, classes, functions, imports, modules, APIs, database models, variables, routes, or functionality.\n"
        "3. If something is not present in the supplied evidence, explicitly state that it is not established by the evidence.\n"
        "4. Every project-specific claim must be traceable to supplied evidence.\n"
        "5. Respond ONLY with valid structured JSON conforming to the schema."
    )

    if q_item["cat"] == "BUG_DETECTION":
        json_instructions = (
            "Respond ONLY with valid JSON:\n"
            "{\n"
            '  "status": "FINDING" | "NO_FINDING",\n'
            '  "category": "RUNTIME_ERROR" | "LOGIC_ERROR",\n'
            '  "severity": "HIGH" | "MEDIUM" | "LOW",\n'
            '  "fileId": "<fileId from evidence>",\n'
            '  "filePath": "<filePath from evidence>",\n'
            '  "startLine": <line_number>,\n'
            '  "endLine": <line_number>,\n'
            '  "evidence": "<exact short code snippet>",\n'
            '  "explanation": "<what is wrong and why>",\n'
            '  "suggestedImprovement": "<how to fix>"\n'
            "}"
        )
    else:
        json_instructions = (
            "Respond ONLY with valid JSON:\n"
            "{\n"
            '  "status": "ANSWER" | "INSUFFICIENT_EVIDENCE",\n'
            '  "summary": "<concise high level explanation grounded strictly in evidence>",\n'
            '  "claims": [\n'
            "    {\n"
            '      "text": "<specific claim grounded in evidence>",\n'
            '      "evidence": [\n'
            "        {\n"
            '          "fileId": "<fileId from evidence>",\n'
            '          "filePath": "<filePath from evidence>",\n'
            '          "startLine": <line_number>,\n'
            '          "endLine": <line_number>\n'
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}"
        )

    full_prompt = f"{full_context}\n\nCRITICAL INSTRUCTIONS:\n{json_instructions}"
    return system_prompt, full_prompt

def query_model(model_name: str, system_prompt: str, prompt: str, timeout: float = 90.0):
    t0 = time.time()
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model_name,
                "system": system_prompt,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1,
                    "num_predict": 350,
                }
            },
            timeout=timeout
        )
        latency = (time.time() - t0) * 1000
        if resp.status_code == 200:
            data = resp.json()
            return {
                "success": True,
                "raw_text": data.get("response", ""),
                "latency_ms": round(latency, 2),
                "prompt_tokens": data.get("prompt_eval_count", 0),
                "completion_tokens": data.get("eval_count", 0),
                "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
                "error": None,
            }
        else:
            return {
                "success": False,
                "raw_text": "",
                "latency_ms": round(latency, 2),
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "error": f"HTTP {resp.status_code}: {resp.text[:100]}",
            }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "raw_text": "",
            "latency_ms": round((time.time() - t0) * 1000, 2),
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "error": "MODEL_TIMEOUT",
        }
    except Exception as e:
        return {
            "success": False,
            "raw_text": "",
            "latency_ms": round((time.time() - t0) * 1000, 2),
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "error": f"AI_UNAVAILABLE: {str(e)[:100]}",
        }

def run_benchmark():
    models = ["qwen2.5-coder:1.5b", "qwen2.5-coder:7b"]
    all_results = {}
    human_eval_dataset = []

    canonical_all = [build_canonical_evidence_for_file(f) for f in REPO_FILES]
    proj_struct = [f["filePath"] for f in REPO_FILES]

    print("===================================================================")
    print("=== DEVSHARE MODEL BENCHMARK: 1.5B vs 7B UNDER IDENTICAL CONDITIONS ===")
    print("===================================================================")
    print(f"Total benchmark questions: {len(BENCHMARK_QUESTIONS)}")
    print(f"Models to evaluate: {models}")
    print("=" * 67)

    for model in models:
        print(f"\n--- Benchmarking Model: {model} ---")
        model_records = []
        latencies = []
        valid_json_count = 0
        total_claims_count = 0
        validated_claims_count = 0
        unsupported_claims_count = 0
        citations_total = 0
        citations_valid = 0
        total_prompt_tokens = 0
        total_completion_tokens = 0

        manifest = create_evidence_manifest(
            project_id="benchmark_repo_proj",
            query_id=str(uuid.uuid4()),
            model=model,
            canonical_evidence=canonical_all,
        )

        validator = EvidenceValidator(
            canonical_evidence=canonical_all,
            project_structure=proj_struct,
            raw_signals=[],
            manifest=manifest,
        )

        for idx, q in enumerate(BENCHMARK_QUESTIONS, 1):
            sys_prompt, user_prompt = build_prompt_for_query(q, canonical_all)
            res = query_model(model, sys_prompt, user_prompt, timeout=120.0)

            latencies.append(res["latency_ms"])
            total_prompt_tokens += res["prompt_tokens"]
            total_completion_tokens += res["completion_tokens"]

            # Validate output using identical EvidenceValidator
            val_result = validator.validate_llm_response(res["raw_text"], "EXPLAIN", q["query"])
            diag = val_result.get("diagnostics", {})

            is_valid_json = val_result["status"] != "MODEL_OUTPUT_INVALID"
            if is_valid_json:
                valid_json_count += 1

            c_count = diag.get("responseClaimCount", 0)
            v_count = diag.get("validatedClaimCount", 0)
            u_count = diag.get("rejectedClaimCount", 0) + diag.get("hallucinationLikeClaimCount", 0)

            total_claims_count += c_count
            validated_claims_count += v_count
            unsupported_claims_count += u_count

            # Count citation accuracy from claims
            for cl in val_result.get("claims", []):
                for cite in cl.get("evidence", []):
                    citations_total += 1
                    if cite.get("filePath") and cite.get("startLine"):
                        citations_valid += 1

            rec = {
                "questionId": q["id"],
                "category": q["cat"],
                "query": q["query"],
                "model": model,
                "latency_ms": res["latency_ms"],
                "prompt_tokens": res["prompt_tokens"],
                "completion_tokens": res["completion_tokens"],
                "valid_json": is_valid_json,
                "status": val_result["status"],
                "response_text": val_result["response"],
                "claim_count": c_count,
                "validated_claims": v_count,
                "unsupported_claims": u_count,
                "hallucinations_flagged": diag.get("hallucinationLikeClaimCount", 0),
            }
            model_records.append(rec)

            # Human Evaluation Sheet Entry conforming to Requirement 19
            human_eval_dataset.append({
                "questionId": q["id"],
                "category": q["cat"],
                "model": model,
                "query": q["query"],
                "response": val_result["response"],
                "status": val_result["status"],
                "scoring_rubric": {
                    "correctness": "Score 0 (incorrect), 1 (partially correct), 2 (fully correct)",
                    "relevance": "Score 0 (irrelevant), 1 (partially relevant), 2 (directly answers query)",
                    "project_grounding": "Score 0 (ungrounded/hallucinated), 1 (weak grounding), 2 (strictly grounded)",
                    "unsupported_claim": "Score 0 (no unsupported claims), 1 (contains unsupported claims)",
                },
                "human_scores": {
                    "correctness": None,
                    "relevance": None,
                    "project_grounding": None,
                    "unsupported_claim": 1 if u_count > 0 else 0,
                    "evaluatorId": "",
                    "notes": "",
                }
            })

            print(f"  [{q['id']}] {q['cat'][:12]:<12} | Latency: {res['latency_ms']:>6.0f}ms | JSON: {'OK' if is_valid_json else 'ERR'} | Valid Claims: {v_count} | Unsupp: {u_count}")

        # Compute summary statistics
        sorted_lat = sorted(latencies)
        p95_idx = int(len(sorted_lat) * 0.95)
        p95_lat = sorted_lat[min(p95_idx, len(sorted_lat) - 1)]

        grounding_precision = (validated_claims_count / total_claims_count) if total_claims_count > 0 else 0.0
        rejection_rate = (unsupported_claims_count / total_claims_count) if total_claims_count > 0 else 0.0
        citation_acc = (citations_valid / citations_total) if citations_total > 0 else 1.0

        all_results[model] = {
            "model": model,
            "total_questions": len(BENCHMARK_QUESTIONS),
            "valid_json_rate": round(valid_json_count / len(BENCHMARK_QUESTIONS), 4),
            "total_claims": total_claims_count,
            "validated_claims": validated_claims_count,
            "unsupported_claims": unsupported_claims_count,
            "grounding_precision": round(grounding_precision, 4),
            "validator_rejection_rate": round(rejection_rate, 4),
            "citation_accuracy": round(citation_acc, 4),
            "latency_mean_ms": round(statistics.mean(latencies), 2),
            "latency_median_ms": round(statistics.median(latencies), 2),
            "latency_p95_ms": round(p95_lat, 2),
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "avg_completion_tokens": round(total_completion_tokens / len(BENCHMARK_QUESTIONS), 1),
            "records": model_records,
        }

    # Save results to disk
    out_results_path = os.path.join(_ROOT, "scratch", "model_benchmark_results.json")
    with open(out_results_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    out_eval_path = os.path.join(_ROOT, "scratch", "benchmark_human_eval_sheet.json")
    with open(out_eval_path, "w", encoding="utf-8") as f:
        json.dump(human_eval_dataset, f, indent=2)

    print("\n===================================================================")
    print("=== MODEL BENCHMARK SUMMARY (ENGINEERING COMPARISON)           ===")
    print("===================================================================")
    for model, res in all_results.items():
        print(f"\nModel: {model}")
        print(f"  Valid JSON Rate:         {res['valid_json_rate'] * 100:.1f}%")
        print(f"  Grounding Precision:     {res['grounding_precision'] * 100:.1f}% ({res['validated_claims']}/{res['total_claims']} claims)")
        print(f"  Validator Rejection Rate:{res['validator_rejection_rate'] * 100:.1f}% ({res['unsupported_claims']} unsupported)")
        print(f"  Evidence Citation Acc:   {res['citation_accuracy'] * 100:.1f}%")
        print(f"  Latency Mean:            {res['latency_mean_ms']:.1f} ms")
        print(f"  Latency Median:          {res['latency_median_ms']:.1f} ms")
        print(f"  Latency P95:             {res['latency_p95_ms']:.1f} ms")
        print(f"  Total Prompt Tokens:     {res['total_prompt_tokens']}")
        print(f"  Total Completion Tokens: {res['total_completion_tokens']} (avg {res['avg_completion_tokens']}/query)")

    print("\n[NOTE]: As specified in Requirement 17, this 30-query evaluation is an engineering benchmark,")
    print("not a statistically conclusive model evaluation. Neither model is automatically declared a winner.")
    print(f"Human evaluation rubric saved to: {out_eval_path}")
    print("===================================================================")

if __name__ == "__main__":
    run_benchmark()
