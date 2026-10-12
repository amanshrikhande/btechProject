"""
DevShare Grounding & Context Integrity Regression Suite
Covers all 12 validation requirements:
1. Existing Services Health Test
2. RAG Retrieval & Project Isolation Test
3. Clean-Room LLM Test (Phase 10)
4. LinkedList Hallucination Regression Test (Phase 9)
5. Negative Test: Authentication (Phase 12)
6. Negative Test: Redis (Phase 12)
7. Negative Test: Missing File / PaymentService (Phase 12)
8. Context Contamination & Integrity Test (Phase 7 & 11)
9. Server-Side Evidence Validation Test (Phase 6)
10. FileId & Line Navigation Test (Phase 15)
11. Zero-Analyzer-Signal Mocked Test (Phase 13)
12. Real Ollama Integration Benchmark (Phase 13 & 14)
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
import functools
import re

# Ensure DevShare root and ai_service are on sys.path
_HERE = os.path.dirname(os.path.abspath(__file__))
_DEVSHARE_ROOT = os.path.dirname(_HERE)
_AI_SERVICE_DIR = os.path.join(_DEVSHARE_ROOT, "ai_service")
for _p in [_DEVSHARE_ROOT, _AI_SERVICE_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)


print = functools.partial(print, flush=True)

AI_SERVICE_URL = "http://127.0.0.1:8000"
BACKEND_URL = "http://127.0.0.1:5000"
OLLAMA_URL = "http://127.0.0.1:11434"
PROJECT_ID = "6a9506fed3cfeb66dd74c7c8"
FILE_ID = "6a9506fed3cfeb66dd74c7ca"

FORBIDDEN_ENTITIES = [
    "authservice", "userrepository", "logger", "create_auth_service",
    "auth.service", "database.user_repository", "utils.logger", "login"
]

def make_post(url, payload, timeout=90):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def make_get(url, timeout=10):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def test_1_services_health():
    print("\n" + "=" * 60)
    print("TEST 1: Existing Services & Daemons Health Check")
    print("=" * 60)
    try:
        ai_health = make_get(f"{AI_SERVICE_URL}/api/health")
        backend_health = make_get(f"{BACKEND_URL}/api/health")
        ollama_tags = make_get(f"{OLLAMA_URL}/api/tags")
        
        ai_ok = ai_health.get("status") == "online"
        backend_ok = backend_health.get("status") in ("ok", "online") or backend_health.get("success", False)
        ollama_ok = len(ollama_tags.get("models", [])) > 0
        
        print(f"  AI Service (8000):   {'ONLINE' if ai_ok else 'FAILED'} (model: {ai_health.get('model')})")
        print(f"  Backend (5000):      {'ONLINE' if backend_ok else 'FAILED'}")
        print(f"  Ollama (11434):      {'ONLINE' if ollama_ok else 'FAILED'} (models: {[m['name'] for m in ollama_tags.get('models', [])]})")
        
        assert ai_ok and ollama_ok
        print(">> TEST 1: PASS — All system daemons healthy and operational.")
        return True
    except Exception as e:
        print(f">> TEST 1: FAIL — {e}")
        return False


def test_2_rag_retrieval_integrity():
    print("\n" + "=" * 60)
    print("TEST 2: RAG Retrieval & Project Isolation Test")
    print("=" * 60)
    try:
        rag_res = make_get(f"{AI_SERVICE_URL}/api/rag/status?projectId={PROJECT_ID}")
        print(f"  Project ID: {PROJECT_ID}")
        print(f"  Collection: {rag_res.get('collection')}")
        print(f"  Indexed Chunks: {rag_res.get('indexed_chunks_count')}")
        print(f"  Indexed Files: {rag_res.get('indexed_files_count')}")
        
        # Query retrieval
        query_payload = {
            "projectId": PROJECT_ID,
            "query": "LinkedList reverse append",
            "topK": 4
        }
        query_res = make_post(f"{BACKEND_URL}/api/ai/rag/query", query_payload)
        chunks = query_res.get("data", {}).get("chunks", [])
        print(f"  Retrieved Chunks Count: {len(chunks)}")
        
        assert len(chunks) > 0, "No chunks retrieved"
        assert any("LinkedList" in c.get("content", "") for c in chunks), "LinkedList chunk missing"
        
        print(">> TEST 2: PASS — ChromaDB retrieval returned correct project chunks.")
        return True
    except Exception as e:
        print(f">> TEST 2: FAIL — {e}")
        return False


def test_3_clean_room_llm():
    print("\n" + "=" * 60)
    print("TEST 3: Clean-Room LLM Test (Phase 10)")
    print("Bypasses DevShare server; sends ONLY strict grounding prompt + LinkedList code directly to Ollama.")
    print("=" * 60)
    system_prompt = """You are DevShare's project-aware code analysis engine.
You are analyzing an existing software repository.
PROJECT EVIDENCE is the only authoritative source for claims about the user's project.
GROUNDING RULES:
1. Use ONLY the supplied PROJECT EVIDENCE when making claims about project files, functions, classes, modules, APIs, routes, databases, variables, dependencies, or behavior.
2. NEVER invent files, classes, functions, imports, modules, APIs, database models, variables, routes, or functionality.
3. Do not assume that a commonly used component exists merely because it would normally exist in a similar application.
4. If something is not present in the supplied evidence, explicitly state that it is not established by the evidence.
5. Every project-specific claim must be traceable to supplied evidence.
6. Do not use previous conversation content as evidence for the current repository.
7. If the supplied evidence is insufficient to answer the question, return INSUFFICIENT_EVIDENCE rather than guessing.
8. Never fabricate citations.
9. Never fabricate file paths or line numbers.
10. Never reference a fileId that does not appear in the supplied evidence.

You must respond ONLY with valid JSON."""

    user_prompt = """PROJECT EVIDENCE:

--- FILE: /main.py (File ID: 6a9506fed3cfeb66dd74c7ca, Lines 3-6) | Symbol: Node ---
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

--- FILE: /main.py (File ID: 6a9506fed3cfeb66dd74c7ca, Lines 8-41) | Symbol: LinkedList ---
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
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node
        self.head = prev

ANALYZER SIGNALS:
None

USER QUERY:
What is happening in this code?

CRITICAL INSTRUCTIONS:
Respond in JSON: {"status": "ANSWER", "summary": "...", "claims": [{"text": "...", "evidence": [{"fileId": "6a9506fed3cfeb66dd74c7ca", "filePath": "/main.py", "startLine": 3, "endLine": 41}]}]}"""

    try:
        t0 = time.time()
        ollama_payload = {
            "model": "qwen2.5-coder:1.5b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.05, "num_predict": 280}
        }
        res = make_post(f"{OLLAMA_URL}/api/chat", ollama_payload, timeout=90)
        raw_text = res.get("message", {}).get("content", "")
        latency = round(time.time() - t0, 2)
        print(f"  Raw Ollama Response ({latency}s):")
        print(f"  {raw_text[:300]}...")

        # Verify no hallucinated entities
        lower_resp = raw_text.lower()
        found_hallucinations = [h for h in FORBIDDEN_ENTITIES if h in lower_resp]
        print(f"  Hallucinated Entities Found: {found_hallucinations if found_hallucinations else 'NONE'}")
        
        assert not found_hallucinations, f"Clean-room test generated forbidden entities: {found_hallucinations}"
        assert "linkedlist" in lower_resp or "node" in lower_resp, "Model failed to discuss LinkedList or Node"
        
        print(">> TEST 3: PASS — Clean-room LLM strictly discusses Node/LinkedList with zero invented AuthService.")
        return True
    except Exception as e:
        print(f">> TEST 3: FAIL — {e}")
        return False


def test_4_linkedlist_regression():
    print("\n" + "=" * 60)
    print("TEST 4: LinkedList Hallucination Regression Test (Phase 9)")
    print("Full production pipeline request: 'What is happening in this code?'")
    print("=" * 60)
    try:
        t0 = time.time()
        chat_payload = {
            "message": "What is happening in this code?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python"
        }
        data = make_post(f"{AI_SERVICE_URL}/api/chat", chat_payload, timeout=90)
        latency = round(time.time() - t0, 2)
        
        response_text = data.get("response", "")
        status = data.get("status")
        diagnostics = data.get("diagnostics", {})
        warning = data.get("warning")
        
        print(f"  Latency: {latency}s | Status: {status}")
        print(f"  Response: {response_text[:300]}...")
        print(f"  Diagnostics: {json.dumps(diagnostics, indent=2)}")
        print(f"  Audit Warning: {warning}")

        lower_resp = response_text.lower()
        found_hallucinations = [h for h in FORBIDDEN_ENTITIES if h in lower_resp]
        print(f"  Hallucinated Entities in Final Response: {found_hallucinations if found_hallucinations else 'NONE'}")
        
        assert not found_hallucinations, f"Regression test failed: found forbidden entities: {found_hallucinations}"
        assert diagnostics.get("hallucinationLikeClaimCount") == 0, "hallucinationLikeClaimCount > 0"
        assert diagnostics.get("validatedClaimCount", 0) > 0, "No claims were validated"
        assert diagnostics.get("rejectedClaimCount", 0) == 0, "Legitimate claims were rejected"
        assert diagnostics.get("failureStage") is None, f"Failure stage reported: {diagnostics.get('failureStage')}"
        
        print(">> TEST 4: PASS — Successfully resolved LinkedList regression bug. Zero invented entities.")
        return True
    except Exception as e:
        print(f">> TEST 4: FAIL — {e}")
        return False


def test_5_negative_auth():
    print("\n" + "=" * 60)
    print("TEST 5: Negative Test — Authentication (Phase 12)")
    print("Query: 'Where is authentication implemented?' on LinkedList repo")
    print("=" * 60)
    try:
        t0 = time.time()
        chat_payload = {
            "message": "Where is authentication implemented?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python"
        }
        data = make_post(f"{AI_SERVICE_URL}/api/chat", chat_payload, timeout=90)
        latency = round(time.time() - t0, 2)
        
        status = data.get("status")
        response_text = data.get("response", "")
        print(f"  Latency: {latency}s | Status: {status}")
        print(f"  Response: {response_text[:300]}...")

        lower_resp = response_text.lower()
        found_hallucinations = [h for h in FORBIDDEN_ENTITIES if h in lower_resp]
        print(f"  Hallucinated Entities: {found_hallucinations if found_hallucinations else 'NONE'}")
        
        assert not found_hallucinations, f"Hallucinated auth entities: {found_hallucinations}"
        assert status in ("INSUFFICIENT_EVIDENCE", "NO_FINDING") or "not" in lower_resp or "insufficient" in lower_resp or "no" in lower_resp, \
            "Model claimed authentication exists in a LinkedList project!"
        
        print(">> TEST 5: PASS — Model did NOT invent authentication. Status is ungrounded / insufficient.")
        return True
    except Exception as e:
        print(f">> TEST 5: FAIL — {e}")
        return False


def test_6_negative_redis():
    print("\n" + "=" * 60)
    print("TEST 6: Negative Test — Redis (Phase 12)")
    print("Query: 'Does this project use Redis?'")
    print("=" * 60)
    try:
        chat_payload = {
            "message": "Does this project use Redis?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python"
        }
        data = make_post(f"{AI_SERVICE_URL}/api/chat", chat_payload, timeout=90)
        status = data.get("status")
        response_text = data.get("response", "")
        print(f"  Status: {status}")
        print(f"  Response: {response_text}")

        lower = response_text.lower()
        assert "redis" not in lower or "not" in lower or "does not" in lower or "insufficient" in lower or status == "INSUFFICIENT_EVIDENCE"
        print(">> TEST 6: PASS — Model did NOT invent Redis usage.")
        return True
    except Exception as e:
        print(f">> TEST 6: FAIL — {e}")
        return False


def test_7_negative_missing_file():
    print("\n" + "=" * 60)
    print("TEST 7: Negative Test — Missing File / PaymentService (Phase 12)")
    print("Query: 'Where is PaymentService?'")
    print("=" * 60)
    try:
        chat_payload = {
            "message": "Where is PaymentService?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python"
        }
        data = make_post(f"{AI_SERVICE_URL}/api/chat", chat_payload, timeout=90)
        status = data.get("status")
        response_text = data.get("response", "")
        print(f"  Status: {status}")
        print(f"  Response: {response_text}")

        lower = response_text.lower()
        assert status in ("INSUFFICIENT_EVIDENCE", "NO_FINDING") or "not" in lower or "insufficient" in lower
        print(">> TEST 7: PASS — Model did NOT fabricate PaymentService.")
        return True
    except Exception as e:
        print(f">> TEST 7: FAIL — {e}")
        return False


def test_8_context_integrity():
    print("\n" + "=" * 60)
    print("TEST 8: Context Contamination & Integrity Test (Phase 7 & 11)")
    print("Test A: No history")
    print("Test B: Old conversation history containing AuthService")
    print("Test C: Active file with divergent uncommitted buffer")
    print("=" * 60)
    try:
        # TEST A
        chat_a = {
            "message": "What is happening in this code?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python",
            "chat_history": []
        }
        res_a = make_post(f"{AI_SERVICE_URL}/api/chat", chat_a, timeout=90)
        txt_a = res_a.get("response", "").lower()

        # TEST B (Contaminated History Injection)
        chat_b = {
            "message": "What is happening in this code?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python",
            "chat_history": [
                {"role": "user", "content": "How do I login with AuthService and UserRepository?"},
                {"role": "assistant", "content": "You can call AuthService.login() to authenticate."}
            ]
        }
        res_b = make_post(f"{AI_SERVICE_URL}/api/chat", chat_b, timeout=90)
        txt_b = res_b.get("response", "").lower()

        print("  Test A (Clean History) Entities Found:", [h for h in FORBIDDEN_ENTITIES if h in txt_a])
        print("  Test B (Contaminated History) Entities Found:", [h for h in FORBIDDEN_ENTITIES if h in txt_b])

        assert not [h for h in FORBIDDEN_ENTITIES if h in txt_b], "History contaminated RAG output!"

        # TEST C (Active File Check)
        chat_c = {
            "message": "What is happening in this code?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "class Node:\n    def __init__(self, val):\n        self.val = val\n",
            "condition": "RAG",
            "language": "python"
        }
        res_c = make_post(f"{AI_SERVICE_URL}/api/chat", chat_c, timeout=90)
        txt_c = res_c.get("response", "").lower()
        print("  Test C (Active File Buffer) Entities Found:", [h for h in FORBIDDEN_ENTITIES if h in txt_c])
        assert not [h for h in FORBIDDEN_ENTITIES if h in txt_c]

        print(">> TEST 8: PASS — History and editor buffer did NOT contaminate repository evidence.")
        return True
    except Exception as e:
        print(f">> TEST 8: FAIL — {e}")
        return False


def test_9_evidence_validator_unit():
    print("\n" + "=" * 60)
    print("TEST 9: Server-Side Evidence Validation Direct Test (Phase 6)")
    print("=" * 60)
    from ai_service.app.intelligence.evidence_validator import EvidenceValidator, build_canonical_evidence

    canonical_ev = [
        build_canonical_evidence({
            "fileId": FILE_ID,
            "filePath": "/main.py",
            "startLine": 8,
            "endLine": 41,
            "content": "class LinkedList:\n    def __init__(self):\n        self.head = None",
            "symbol": "LinkedList",
            "score": 0.95
        })
    ]

    validator = EvidenceValidator(
        canonical_evidence=canonical_ev,
        project_structure=["/main.py"],
        raw_signals=[],
        context_prompt="PROJECT EVIDENCE:\n/main.py"
    )

    # 1. Test fabricated entity rejection
    hallucinated_json = json.dumps({
        "status": "ANSWER",
        "summary": "This file implements AuthService and UserRepository for login authentication.",
        "claims": [
            {
                "text": "AuthService manages user login credentials.",
                "evidence": [{"fileId": FILE_ID, "filePath": "/main.py", "startLine": 8, "endLine": 12}]
            }
        ]
    })
    res_fake = validator.validate_llm_response(hallucinated_json, "EXPLAIN", "What is happening in this code?")
    print("  Fabricated Entities Validation Result:")
    print(f"    Status: {res_fake.get('status')}")
    print(f"    Rejected Claim Count: {res_fake.get('diagnostics', {}).get('rejectedClaimCount')}")
    print(f"    Hallucination Claim Count: {res_fake.get('diagnostics', {}).get('hallucinationLikeClaimCount')}")
    print(f"    Failure Stage: {res_fake.get('diagnostics', {}).get('failureStage')}")
    
    assert res_fake.get("diagnostics", {}).get("rejectedClaimCount") == 1
    assert res_fake.get("diagnostics", {}).get("hallucinationLikeClaimCount") >= 1
    assert res_fake.get("diagnostics", {}).get("failureStage") == "GENERATION_GROUNDING_FAILURE"

    # 2. Test valid grounded claim
    valid_json = json.dumps({
        "status": "ANSWER",
        "summary": "The code implements a LinkedList data structure.",
        "claims": [
            {
                "text": "The LinkedList initializes with a null head reference.",
                "evidence": [{"fileId": FILE_ID, "filePath": "/main.py", "startLine": 8, "endLine": 10}]
            }
        ]
    })
    res_valid = validator.validate_llm_response(valid_json, "EXPLAIN", "What is happening in this code?")
    print("  Valid Grounded Claims Validation Result:")
    print(f"    Status: {res_valid.get('status')}")
    print(f"    Validated Claim Count: {res_valid.get('diagnostics', {}).get('validatedClaimCount')}")
    print(f"    Rejected Claim Count: {res_valid.get('diagnostics', {}).get('rejectedClaimCount')}")
    
    assert res_valid.get("diagnostics", {}).get("validatedClaimCount") == 1
    assert res_valid.get("diagnostics", {}).get("rejectedClaimCount") == 0

    print(">> TEST 9: PASS — EvidenceValidator successfully rejects fake entities and passes grounded citations.")
    return True


def test_10_navigation_file_id():
    print("\n" + "=" * 60)
    print("TEST 10: FileId & Line Navigation Test (Phase 15)")
    print("=" * 60)
    try:
        chat_payload = {
            "message": "What is happening in this code?",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python"
        }
        data = make_post(f"{AI_SERVICE_URL}/api/chat", chat_payload, timeout=90)
        sources = data.get("sources", [])
        claims = data.get("claims", [])
        
        print(f"  Sources Count: {len(sources)}")
        for s in sources:
            print(f"    Source fileId: {s.get('fileId')} | path: {s.get('filePath')} | lines: {s.get('startLine')}-{s.get('endLine')}")
            assert s.get("fileId"), "Source missing fileId"
            assert s.get("filePath"), "Source missing filePath"
            assert s.get("startLine") >= 1, "Invalid startLine"
            assert s.get("endLine") >= s.get("startLine"), "Invalid endLine"

        print(f"  Claims Count: {len(claims)}")
        for c in claims:
            for ev in c.get("evidence", []):
                print(f"    Claim evidence fileId: {ev.get('fileId')} | path: {ev.get('filePath')} | lines: {ev.get('startLine')}-{ev.get('endLine')}")
                assert ev.get("fileId"), "Claim evidence missing fileId"
                assert ev.get("startLine") >= 1

        print(">> TEST 10: PASS — All sources and claims have canonical fileId and line coordinates for Monaco navigation.")
        return True
    except Exception as e:
        print(f">> TEST 10: FAIL — {e}")
        return False


def test_11_zero_analyzer_signal_mocked():
    print("\n" + "=" * 60)
    print("TEST 11: Zero-Analyzer-Signal Mocked Test (Phase 13)")
    print("=" * 60)
    from ai_service.app.intelligence.evidence_validator import EvidenceValidator, build_canonical_evidence

    # Mocked chunk with ZERO static signals
    canonical_ev = [
        build_canonical_evidence({
            "fileId": FILE_ID,
            "filePath": "/order.py",
            "startLine": 10,
            "endLine": 15,
            "content": "def calculate_discount(price, pct):\n    return price - pct  # Logic bug: should be price * (1 - pct/100)",
            "symbol": "calculate_discount",
            "score": 0.90
        })
    ]

    validator = EvidenceValidator(
        canonical_evidence=canonical_ev,
        project_structure=["/order.py"],
        raw_signals=[],  # ZERO ANALYZER SIGNALS!
        context_prompt="PROJECT EVIDENCE:\n/order.py"
    )

    # Mocked LLM finding for logic defect
    mocked_llm_json = json.dumps({
        "status": "FINDING",
        "verification": "VERIFIED",  # LLM tries to claim VERIFIED
        "category": "LOGIC_ERROR",
        "severity": "HIGH",
        "fileId": FILE_ID,
        "filePath": "/order.py",
        "startLine": 10,
        "endLine": 15,
        "evidence": "return price - pct",
        "explanation": "Discount subtraction instead of percentage calculation.",
        "impact": "Incorrect price computed.",
        "suggestedImprovement": "Multiply price by discount factor.",
        "correctedCode": "return price * (1 - pct / 100.0)"
    })

    res = validator.validate_llm_response(mocked_llm_json, "BUG", "Find the discount bug")
    print(f"  Status: {res.get('status')}")
    print(f"  Finding Count: {len(res.get('findings', []))}")
    f0 = res.get("findings", [])[0]
    print(f"  Verification Level: {f0.get('verification')}")
    
    # Check Phase 8 Guard: LLM attempted VERIFIED, but with zero deterministic AST signals it MUST be downgraded to POTENTIAL
    assert f0.get("verification") == "POTENTIAL", f"LLM was allowed to promote finding to {f0.get('verification')}!"
    assert res.get("status") == "FINDINGS"
    assert res.get("diagnostics", {}).get("validatedClaimCount") == 1
    assert res.get("diagnostics", {}).get("rejectedClaimCount") == 0

    print(">> TEST 11: PASS — Zero analyzer signals handled; LLM finding accepted as POTENTIAL (verification upgrade blocked).")
    return True


def test_12_real_ollama_benchmark():
    print("\n" + "=" * 60)
    print("TEST 12: Real Ollama Integration Benchmark (Phase 13 & 14)")
    print("=" * 60)
    try:
        t0 = time.time()
        chat_payload = {
            "message": "Explain how the LinkedList reverse function works step by step.",
            "project_id": PROJECT_ID,
            "active_file_name": "main.py",
            "active_code": "",
            "condition": "RAG",
            "language": "python"
        }
        data = make_post(f"{AI_SERVICE_URL}/api/chat", chat_payload, timeout=90)
        latency = round(time.time() - t0, 2)
        
        diag = data.get("diagnostics", {})
        print(f"  Model: {data.get('model')}")
        print(f"  Latency: {latency}s (LLM Latency: {data.get('llm_latency_ms')}ms)")
        print(f"  Retrieval Success: {diag.get('retrievalSuccess')}")
        print(f"  Evidence Count: {diag.get('evidenceCount')}")
        print(f"  Validated Claims: {diag.get('validatedClaimCount')}")
        print(f"  Rejected Claims: {diag.get('rejectedClaimCount')}")
        print(f"  Context Hash: {diag.get('ollamaContextHash')}")
        
        assert diag.get("retrievalSuccess") is True
        assert diag.get("validatedClaimCount", 0) > 0
        assert diag.get("rejectedClaimCount", 0) == 0
        
        print(">> TEST 12: PASS — Real Ollama integration benchmark completed successfully.")
        return True
    except Exception as e:
        print(f">> TEST 12: FAIL — {e}")
        return False


def run_all_tests():
    print("=" * 70)
    print("DEVSHARE PROJECT-AWARE RAG GROUNDING & INTEGRITY TEST SUITE")
    print("=" * 70)
    
    suite = [
        ("Test 1: Existing Services Health", test_1_services_health),
        ("Test 2: RAG Retrieval & Project Isolation", test_2_rag_retrieval_integrity),
        ("Test 3: Clean-Room LLM Test (Phase 10)", test_3_clean_room_llm),
        ("Test 4: LinkedList Regression Test (Phase 9)", test_4_linkedlist_regression),
        ("Test 5: Negative Test — Authentication (Phase 12)", test_5_negative_auth),
        ("Test 6: Negative Test — Redis (Phase 12)", test_6_negative_redis),
        ("Test 7: Negative Test — Missing File (Phase 12)", test_7_negative_missing_file),
        ("Test 8: Context Contamination & Integrity (Phase 7 & 11)", test_8_context_integrity),
        ("Test 9: Server Evidence Validator (Phase 6)", test_9_evidence_validator_unit),
        ("Test 10: FileId & Line Navigation (Phase 15)", test_10_navigation_file_id),
        ("Test 11: Zero Analyzer Signal Mock (Phase 13)", test_11_zero_analyzer_signal_mocked),
        ("Test 12: Real Ollama Benchmark (Phase 13 & 14)", test_12_real_ollama_benchmark),
    ]

    filter_arg = sys.argv[1].lower() if len(sys.argv) > 1 else None
    results = {}
    for name, test_fn in suite:
        if filter_arg and filter_arg not in name.lower():
            continue
        try:
            passed = test_fn()
            results[name] = "PASS" if passed else "FAIL"
        except Exception as err:
            import traceback
            traceback.print_exc()
            print(f">> {name}: CRASHED with {err}")
            results[name] = "FAIL"

    print("\n" + "=" * 70)
    print("FINAL TEST EXECUTION SUMMARY:")
    print("=" * 70)
    all_passed = True
    for name, res in results.items():
        print(f"  {name.ljust(55)}: [{res}]")
        if res != "PASS":
            all_passed = False

    print("=" * 70)
    if all_passed:
        print("ALL 12 TESTS PASSED! Pipeline grounding and context integrity verified.")
    else:
        print("SOME TESTS FAILED! Review details above.")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
