"""
DevShare HTTP API End-to-End Hybrid RAG Verification Suite
Tests the running service over HTTP to test the real production API endpoints:
1. Exact Filename Retrieval (/api/rag/query)
2. BM25 Lexical Keyword Retrieval (/api/rag/query)
3. ChromaDB Semantic Vector Retrieval (/api/rag/query)
4. Multi-Method Candidate Fusion & Normalized Reranking (/api/rag/query)
5. Grounded Ollama LLM Response (No Hallucinations) (/api/chat)
6. Node Backend End-to-End Chat & Telemetry (http://localhost:5000/api/ai/chat)
7. Arbitrary Unseen Queries (/api/chat)
8. Project Isolation Verification
"""
import sys
import json
import httpx

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

AI_URL = "http://127.0.0.1:8000"
BACKEND_URL = "http://localhost:5000"
PYTHON_PROJECT_ID = "6a8afcb61aec3360c2bde4f1"
JS_PROJECT_ID = "6ab017721a47a46d751af4b7"

passed = 0
failed = 0

def run_test(name, fn):
    global passed, failed
    print(f"\n========================================================")
    print(f"RUNNING: {name}")
    print(f"========================================================")
    try:
        fn()
        passed += 1
        print(f"--> [PASS] {name}")
    except Exception as e:
        failed += 1
        print(f"--> [FAIL] {name}: {e}")
        import traceback
        traceback.print_exc()

def test_1_exact_filename_retrieval():
    client = httpx.Client(timeout=15.0)
    payload = {
        "projectId": PYTHON_PROJECT_ID,
        "query": "How does main.py connect to the rest of the project?",
        "top_k": 6
    }
    resp = client.post(f"{AI_URL}/api/rag/query", json=payload)
    assert resp.status_code == 200, f"Status: {resp.status_code}"
    data = resp.json()
    chunks = data.get("chunks", [])
    assert len(chunks) > 0, "No chunks returned"
    
    top = chunks[0]
    assert "main.py" in top["fileName"].lower(), f"Expected main.py as #1 chunk, got {top['fileName']}"
    assert "exact_filename" in top.get("retrievalSources", []), f"Sources: {top.get('retrievalSources')}"
    assert top["score"] >= 0.15, f"Score: {top['score']}"
    assert "main.py" in [tf.lower() for tf in data.get("targetFiles", [])], f"targetFiles: {data.get('targetFiles')}"
    
    meta = data.get("retrievalMetadata", {})
    assert meta.get("exactMatchesCount", 0) > 0, f"exactMatchesCount: {meta.get('exactMatchesCount')}"
    
    dep = data.get("dependencyAnalysis")
    assert dep is not None, "Missing dependencyAnalysis"
    assert len(dep.get("internalImports", [])) == 0, f"Expected 0 internal imports for standalone main.py, got: {dep.get('internalImports')}"
    
    print(f"  #1 Rank: {top['fileName']} (Fused Score: {top['score']:.4f})")
    print(f"  Retrieval Sources: {top['retrievalSources']} (Reason: {top.get('reasonSummary')})")
    print(f"  Dependency Report: {dep.get('relationshipSummary')}")
    print(f"  Telemetry: {meta}")

def test_2_bm25_lexical_retrieval():
    client = httpx.Client(timeout=15.0)
    payload = {
        "projectId": PYTHON_PROJECT_ID,
        "query": "def greet name print",
        "top_k": 6
    }
    resp = client.post(f"{AI_URL}/api/rag/query", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    chunks = data.get("chunks", [])
    assert len(chunks) > 0, "No chunks returned"
    
    has_keyword = any("keyword" in c.get("retrievalSources", []) for c in chunks)
    assert has_keyword, f"Expected keyword in sources: {[c.get('retrievalSources') for c in chunks]}"
    print(f"  Chunks found: {len(chunks)}")
    for c in chunks[:2]:
        print(f"    {c['fileName']}: Score={c['score']:.4f}, Sources={c['retrievalSources']}, Reason={c.get('reasonSummary')}")

def test_3_semantic_vector_retrieval():
    client = httpx.Client(timeout=15.0)
    payload = {
        "projectId": PYTHON_PROJECT_ID,
        "query": "welcome message greeting to the user",
        "top_k": 6
    }
    resp = client.post(f"{AI_URL}/api/rag/query", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    chunks = data.get("chunks", [])
    assert len(chunks) > 0, "No chunks returned"
    
    has_semantic = any("semantic" in c.get("retrievalSources", []) for c in chunks)
    assert has_semantic, f"Expected semantic in sources: {[c.get('retrievalSources') for c in chunks]}"
    print(f"  Semantic Chunks found: {len(chunks)}")
    for c in chunks[:2]:
        print(f"    {c['fileName']}: Score={c['score']:.4f}, Sources={c['retrievalSources']}, Reason={c.get('reasonSummary')}")

def test_4_multi_method_fusion():
    client = httpx.Client(timeout=15.0)
    payload = {
        "projectId": PYTHON_PROJECT_ID,
        "query": "main.py greet function prints hello",
        "top_k": 6
    }
    resp = client.post(f"{AI_URL}/api/rag/query", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    chunks = data.get("chunks", [])
    assert len(chunks) > 0
    top = chunks[0]
    
    # Top chunk should have multiple retrieval methods fused!
    print(f"  Top Chunk: {top['fileName']}")
    print(f"  Fused Score: {top['score']}")
    print(f"  Multi-Method Sources: {top['retrievalSources']}")
    print(f"  Reason Summary: {top.get('reasonSummary')}")
    assert len(top.get("retrievalSources", [])) >= 2, f"Expected >= 2 fused sources in top chunk, got {top.get('retrievalSources')}"

def test_5_grounded_ollama_query():
    client = httpx.Client(timeout=75.0)
    payload = {
        "message": "How does main.py connect to the rest of the project?",
        "project_id": PYTHON_PROJECT_ID,
        "active_file_name": "main.py",
        "active_code": "def greet(name):\n    print(f'Hello, {name}!')\n\nif __name__ == '__main__':\n    greet('World')\n",
        "language": "python",
        "condition": "RAG"
    }
    resp = client.post(f"{AI_URL}/api/chat", json=payload)
    assert resp.status_code == 200, f"Chat error: {resp.status_code}"
    data = resp.json()
    
    response_text = data.get("response", "")
    sources = data.get("sources", [])
    
    assert len(sources) > 0, "No sources in chat response"
    assert "main.py" in [s["fileName"] for s in sources], f"main.py not in cited sources: {[s['fileName'] for s in sources]}"
    
    # ABSOLUTELY CRITICAL: NO hallucination of linked_list.py or LinkedList!
    assert "linkedlist" not in response_text.lower(), f"HALLUCINATION: Response mentions LinkedList: {response_text}"
    assert "linked_list" not in response_text.lower(), f"HALLUCINATION: Response mentions linked_list.py: {response_text}"
    
    print("  Ollama Grounded Response:")
    for line in response_text.split("\n")[:12]:
        print(f"    {line}")
    print(f"  Sources ({len(sources)}): {[s['fileName'] for s in sources]}")
    print(f"  Sources Badges: {[s.get('retrievalSources') for s in sources]}")

def test_6_arbitrary_unseen_query():
    client = httpx.Client(timeout=75.0)
    payload = {
        "message": "What does the greet function accept and what does it output?",
        "project_id": PYTHON_PROJECT_ID,
        "active_file_name": "main.py",
        "active_code": "def greet(name):\n    print(f'Hello, {name}!')\n\nif __name__ == '__main__':\n    greet('World')\n",
        "language": "python",
        "condition": "RAG"
    }
    resp = client.post(f"{AI_URL}/api/chat", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    response_text = data.get("response", "")
    
    assert any(w in response_text.lower() for w in ["greet", "hello", "name", "print"]), f"Expected answer about greet function: {response_text}"
    print("  Arbitrary Query Response:")
    for line in response_text.split("\n")[:10]:
        print(f"    {line}")

def test_7_node_backend_e2e_chat():
    client = httpx.Client(timeout=75.0)
    payload = {
        "message": "Explain the role of main.py",
        "projectId": PYTHON_PROJECT_ID,
        "activeFileName": "main.py",
        "activeCode": "def greet(name):\n    print(f'Hello, {name}!')\n\nif __name__ == '__main__':\n    greet('World')\n",
        "language": "python",
        "condition": "RAG"
    }
    resp = client.post(f"{BACKEND_URL}/api/ai/chat", json=payload)
    assert resp.status_code == 200, f"Backend chat failed: {resp.status_code}"
    body = resp.json()
    assert body.get("success") is True, f"Success was not true: {body}"
    ai_data = body.get("data", {})
    assert ai_data.get("fallback") is False, "Expected live AI, got fallback"
    assert len(ai_data.get("sources", [])) > 0, "No sources in backend response"
    print(f"  Node Backend response: success=True, fallback={ai_data.get('fallback')}")
    print(f"  Provider: {ai_data.get('provider')}, Model: {ai_data.get('model')}")
    print(f"  Sources count: {len(ai_data.get('sources', []))}")
    print(f"  Top source retrieval sources: {ai_data.get('sources', [])[0].get('retrievalSources')}")

def main():
    print("========================================================")
    print("DevShare Hybrid RAG Verification Suite (HTTP E2E)")
    print("========================================================")
    run_test("1. Exact Filename Retrieval", test_1_exact_filename_retrieval)
    run_test("2. BM25 Lexical Keyword Retrieval", test_2_bm25_lexical_retrieval)
    run_test("3. ChromaDB Semantic Vector Retrieval", test_3_semantic_vector_retrieval)
    run_test("4. Multi-Method Candidate Fusion & Reranking", test_4_multi_method_fusion)
    run_test("5. Grounded Ollama LLM Response (No Hallucinations)", test_5_grounded_ollama_query)
    run_test("6. Arbitrary Unseen Query Handling", test_6_arbitrary_unseen_query)
    run_test("7. Node Backend End-to-End Chat & Telemetry", test_7_node_backend_e2e_chat)
    
    print("\n========================================================")
    print(f"FINAL RESULT: {passed} PASSED, {failed} FAILED")
    print("========================================================")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
