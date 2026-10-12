"""
DevShare Hybrid RAG Verification Suite
Validates:
1. Exact Filename Retrieval (#1 rank, exact_filename badge)
2. BM25 Lexical Retrieval (keyword matching, lexical badge)
3. ChromaDB Semantic Retrieval (cosine similarity, semantic badge)
4. Static Dependency Graph Traversal (import expansion, dependency badge)
5. Multi-Method Candidate Fusion & Normalized Reranking
6. Cross-Project Collection Isolation
7. Grounded Ollama LLM Response (no hallucinated linked_list.py)
8. Arbitrary User Queries
"""
import sys
import os
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add ai_service to path
ai_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai_service"))
if ai_dir not in sys.path:
    sys.path.insert(0, ai_dir)

from app.rag.vectorstore import vector_store
from app.rag.lexical_search import lexical_store
from app.rag.dependency_graph import dependency_manager
from app.rag.hybrid_retriever import hybrid_retriever
import httpx

PYTHON_PROJECT_ID = "6a8afcb61aec3360c2bde4f1"
JS_PROJECT_ID = "6ab017721a47a46d751af4b7"

passed_tests = 0
failed_tests = 0

def run_test(name, fn):
    global passed_tests, failed_tests
    print(f"\n========================================================")
    print(f"RUNNING: {name}")
    print(f"========================================================")
    try:
        fn()
        passed_tests += 1
        print(f"--> [PASS] {name}")
    except Exception as e:
        failed_tests += 1
        print(f"--> [FAIL] {name}: {e}")
        import traceback
        traceback.print_exc()

def test_1_exact_filename_retrieval():
    res = vector_store.query_project(PYTHON_PROJECT_ID, "How does main.py connect to the rest of the project?", top_k=6)
    chunks = res.get("chunks", [])
    assert len(chunks) > 0, "No chunks returned"
    
    top_chunk = chunks[0]
    assert "main.py" in top_chunk["fileName"].lower(), f"Expected main.py as #1 chunk, got {top_chunk['fileName']}"
    assert "exact_filename" in top_chunk.get("retrievalSources", []), f"Expected exact_filename in sources, got {top_chunk.get('retrievalSources')}"
    assert top_chunk["score"] > 0.15, f"Expected non-zero fused score, got {top_chunk['score']}"
    assert "main.py" in [os.path.basename(tf).lower() for tf in res.get("targetFiles", [])], "main.py not in targetFiles"
    
    dep = res.get("dependencyAnalysis")
    assert dep is not None, "Expected dependencyAnalysis report"
    assert len(dep.get("internalImports", [])) == 0, f"Expected 0 internal imports for standalone main.py, got {dep.get('internalImports')}"
    print(f"  Top chunk: {top_chunk['fileName']} (Score: {top_chunk['score']})")
    print(f"  Retrieval sources: {top_chunk['retrievalSources']}")
    print(f"  Target files identified: {res.get('targetFiles')}")
    print(f"  Dependency summary: {dep.get('relationshipSummary')}")

def test_2_lexical_bm25_retrieval():
    # Index chunks into lexical store if needed
    vector_store._ensure_project_loaded(PYTHON_PROJECT_ID)
    res = vector_store.query_project(PYTHON_PROJECT_ID, "def greet name message", top_k=6)
    chunks = res.get("chunks", [])
    assert len(chunks) > 0, "No chunks returned for lexical query"
    
    has_keyword_source = any("keyword" in c.get("retrievalSources", []) for c in chunks)
    assert has_keyword_source, f"Expected at least one chunk to have 'keyword' in retrievalSources: {[c.get('retrievalSources') for c in chunks]}"
    print(f"  Found {len(chunks)} chunks, keyword source present: {has_keyword_source}")
    for c in chunks[:2]:
        print(f"  Chunk: {c['fileName']} | Sources: {c['retrievalSources']} | Score: {c['score']}")

def test_3_semantic_vector_retrieval():
    vector_store._ensure_project_loaded(PYTHON_PROJECT_ID)
    res = vector_store.query_project(PYTHON_PROJECT_ID, "welcoming a user with a friendly greeting", top_k=6)
    chunks = res.get("chunks", [])
    assert len(chunks) > 0, "No chunks returned for semantic query"
    
    has_semantic_source = any("semantic" in c.get("retrievalSources", []) for c in chunks)
    assert has_semantic_source, f"Expected semantic retrieval source: {[c.get('retrievalSources') for c in chunks]}"
    print(f"  Semantic match found: {[c['fileName'] for c in chunks]}")
    for c in chunks[:2]:
        print(f"  Chunk: {c['fileName']} | Sources: {c['retrievalSources']} | Score: {c['score']}")

def test_4_dependency_graph_expansion():
    # Test with multi-file mock project
    test_pid = "test_dep_expansion_pid"
    mock_files = [
        {
            "fileName": "app.py",
            "filePath": "/app.py",
            "content": "from service import compute_total\n\ndef main():\n    return compute_total(10)\n",
            "language": "python"
        },
        {
            "fileName": "service.py",
            "filePath": "/service.py",
            "content": "def compute_total(x):\n    return x * 2\n",
            "language": "python"
        },
        {
            "fileName": "unrelated.py",
            "filePath": "/unrelated.py",
            "content": "def unrelated_func():\n    pass\n",
            "language": "python"
        }
    ]
    vector_store.index_project_files(test_pid, mock_files)
    
    res = vector_store.query_project(test_pid, "Explain app.py", top_k=6)
    chunks = res.get("chunks", [])
    retrieved_files = [c["fileName"] for c in chunks]
    
    assert "app.py" in retrieved_files, f"Expected app.py in retrieved files: {retrieved_files}"
    assert "service.py" in retrieved_files, f"Expected service.py to be pulled in via dependency graph: {retrieved_files}"
    
    service_chunk = next(c for c in chunks if c["fileName"] == "service.py")
    assert "dependency" in service_chunk.get("retrievalSources", []), f"Expected dependency in service.py sources: {service_chunk.get('retrievalSources')}"
    print(f"  app.py retrieved and expanded to: {retrieved_files}")
    print(f"  service.py sources: {service_chunk.get('retrievalSources')}")

def test_5_project_isolation():
    res_a = vector_store.query_project(PYTHON_PROJECT_ID, "main.py greet", top_k=6)
    files_a = [c["fileName"] for c in res_a.get("chunks", [])]
    
    # Verify no Project B files in Project A results
    for fn in files_a:
        assert not fn.endswith(".js"), f"Found JS file {fn} in Python Project A"
        
    print(f"  Project A files: {files_a} (Zero cross-project leakage)")

def test_6_grounded_ollama_query():
    client = httpx.Client(timeout=60.0)
    payload = {
        "message": "How does main.py connect to the rest of the project?",
        "project_id": PYTHON_PROJECT_ID,
        "active_file_name": "main.py",
        "active_code": "def greet(name):\n    print(f'Hello, {name}!')\n\nif __name__ == '__main__':\n    greet('World')\n",
        "language": "python",
        "condition": "RAG"
    }
    resp = client.post("http://127.0.0.1:8000/api/chat", json=payload)
    assert resp.status_code == 200, f"Chat endpoint failed with status {resp.status_code}"
    
    data = resp.json()
    response_text = data.get("response", "")
    sources = data.get("sources", [])
    
    assert len(sources) > 0, "No sources returned in chat response"
    assert "main.py" in [s["fileName"] for s in sources], f"main.py not cited in sources: {[s['fileName'] for s in sources]}"
    
    # CRITICAL TEST: Verify NO hallucination of linked_list.py or LinkedList
    assert "linkedlist" not in response_text.lower(), f"HALLUCINATION DETECTED: Response mentions LinkedList: {response_text}"
    assert "linked_list" not in response_text.lower(), f"HALLUCINATION DETECTED: Response mentions linked_list.py: {response_text}"
    
    print("  Ollama LLM Response Preview:")
    for line in response_text.split("\n")[:10]:
        print(f"    {line}")
    print(f"  Sources count: {len(sources)}")
    print(f"  Retrieval metadata: {data.get('retrievalMetadata')}")

def test_7_arbitrary_unseen_query():
    client = httpx.Client(timeout=60.0)
    payload = {
        "message": "What does the greet function accept and what does it print?",
        "project_id": PYTHON_PROJECT_ID,
        "active_file_name": "main.py",
        "active_code": "def greet(name):\n    print(f'Hello, {name}!')\n\nif __name__ == '__main__':\n    greet('World')\n",
        "language": "python",
        "condition": "RAG"
    }
    resp = client.post("http://127.0.0.1:8000/api/chat", json=payload)
    assert resp.status_code == 200
    
    data = resp.json()
    response_text = data.get("response", "")
    assert "greet" in response_text.lower() or "hello" in response_text.lower() or "name" in response_text.lower(), f"Expected explanation of greet function: {response_text}"
    print("  Arbitrary Query Response Preview:")
    for line in response_text.split("\n")[:8]:
        print(f"    {line}")

def main():
    print("Starting DevShare Hybrid RAG Verification Suite...")
    run_test("1. Exact Filename Retrieval", test_1_exact_filename_retrieval)
    run_test("2. BM25 Lexical Keyword Retrieval", test_2_lexical_bm25_retrieval)
    run_test("3. ChromaDB Semantic Vector Retrieval", test_3_semantic_vector_retrieval)
    run_test("4. Code Structure & Dependency Graph Expansion", test_4_dependency_graph_expansion)
    run_test("5. Cross-Project Collection Isolation", test_5_project_isolation)
    run_test("6. Grounded Ollama LLM Response (No LinkedList Hallucination)", test_6_grounded_ollama_query)
    run_test("7. Arbitrary User Query Generalization", test_7_arbitrary_unseen_query)
    
    print("\n========================================================")
    print(f"TEST SUMMARY: {passed_tests} PASSED, {failed_tests} FAILED")
    print("========================================================")
    if failed_tests > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
