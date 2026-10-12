# DevShare Runtime AI Architecture & Technical Specification

## 1. Executive Summary & Critical Model Separation

> [!IMPORTANT]
> **Definitive Model Separation:**
> - **Antigravity Development Assistant (Gemini):** Used exclusively as an external pair-programming assistant to develop, audit, and modify code in the repository.
> - **DevShare Runtime AI:** Strictly uses **Local Ollama** (defaulting to `qwen2.5-coder:1.5b` or installed local models).
> - **Runtime Guarantee:** Gemini is used through Antigravity as the development assistant. It is **NOT** the runtime LLM of DevShare. DevShare's runtime LLM uses the locally hosted Ollama service. DevShare runtime code contains zero Gemini endpoints, zero Google Generative AI libraries, and zero cloud API keys.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 DEVSHARE FRONTEND                                 |
|                                                                                   |
|  [ Monaco Editor ] <----+ Line Jump        [ AI Assistant Drawer ]                |
|         |               |                        |                                |
|         |               +-- Evidence Citations --+                                |
|         |                                        |                                |
|         | Mode: [ Project RAG | Generic AI ]     | Actions: [Debug|Tests|Patch]   |
+---------|----------------------------------------|--------------------------------+
          |                                        |
          v                                        v
+-----------------------------------------------------------------------------------+
|                           DEVSHARE NODE.JS / EXPRESS                              |
|                                                                                   |
|   - Real-time Collaboration (Socket.IO)      - Audit & Experiment Telemetry       |
|   - Project & File Persistence (MongoDB)       (SessionEvent collection)          |
|   - Native Code Execution (Piston / Node)    - AI Proxy (:5000 -> :8000)          |
+--------------------------------------------------|--------------------------------+
                                                   |
                                                   v
+-----------------------------------------------------------------------------------+
|                        DEVSHARE FASTAPI AI MICROSERVICE (:8000)                   |
|                                                                                   |
|   1. Code-Aware Chunker (AST & Symbol Parser)                                     |
|   2. Persistent Vector Store (ChromaDB `proj_<projectId>`)                         |
|   3. CodeBERT Defect Classifier & Hazard Patterns                                 |
|   4. Prompt Synthesizer & Context Builder                                         |
|   5. Local Ollama LLM Caller (:11434)                                             |
|   6. Transparent Fallback Engine (Offline Mode)                                   |
+--------------------------------------------------|--------------------------------+
                                                   |
                                                   v
                                 +-----------------------------------+
                                 |         LOCAL OLLAMA DAEMON       |
                                 |         http://127.0.0.1:11434    |
                                 |   Model: qwen2.5-coder:1.5b       |
                                 +-----------------------------------+
```

---

## 3. Detailed Component Breakdown

### 3.1 Code-Aware RAG Chunking (`app/rag/chunker.py`)
Rather than arbitrary character splitting, the code chunker analyzes structural language boundaries:
- **JavaScript / TypeScript / JSX / TSX:** Identifies function declarations, arrow functions, ES6 classes, routes (`router.get`, `app.post`), and preamble imports.
- **Python:** Utilizes `ast.parse` to extract `FunctionDef`, `AsyncFunctionDef`, and `ClassDef` boundaries with accurate line spans (`lineno` to `end_lineno`).
- **C-Family (C, C++, Java):** Detects class, struct, interface, and method signatures.
- **Metadata Preserved per Chunk:**
  ```json
  {
    "projectId": "proj_123",
    "fileId": "f_auth_1",
    "fileName": "auth.controller.js",
    "filePath": "/src/controllers/auth.controller.js",
    "language": "javascript",
    "symbol": "validateCredentials",
    "symbolType": "function",
    "startLine": 20,
    "endLine": 48,
    "chunkIndex": 1
  }
  ```

### 3.2 Project-Isolated Vector Store (`app/rag/vectorstore.py`)
- **Collection Isolation:** Each project is indexed into its own isolated ChromaDB collection named `proj_<projectId>`.
- **Security Guarantee:** Code from Project A can never be retrieved when querying Project B.
- **File Filtering:** Ignores non-source artifacts (`node_modules`, `.git`, `.env`, secret keys, binary assets).
- **Genuine Similarity Scoring:** Uses mathematically true cosine distance conversions (`score = 1.0 / (1.0 + distance)`) bounded between 0.0 and 1.0.

### 3.3 Runtime LLM: Local Ollama (`app/main.py`)
- Queries `http://127.0.0.1:11434/api/chat` (falling back to `/api/generate`).
- Prioritizes coding models: `qwen2.5-coder:1.5b` or `deepseek-coder`.
- **Zero Cloud Leakage:** All inference executes completely on the developer's local machine.

### 3.4 CodeBERT Neural Defect Classifier
- Analyzes active code for 5 distinct hazard categories:
  1. `NO_ISSUE` (Clean structural integrity)
  2. `SECURITY_ISSUE` (CWE-79 unescaped HTML, CWE-95 eval, arbitrary execution)
  3. `RUNTIME_ERROR` (Null/undefined dereferences, unhandled exceptions)
  4. `PERFORMANCE_ISSUE` (DOM query in loops, quadratic string concatenation)
  5. `LOGIC_ERROR` (Loose equality `==`, ASI splits, empty catch blocks)

---

## 4. Advanced Workflows & Developer Features

### 4.1 RAG Evidence Transparency & Monaco Navigation
- When a RAG query is answered, the UI renders the **Retrieved Evidence Panel**:
  - Displays rank, file name, line range, genuine relevance score, and snippet.
  - Clicking **[Open in Editor]** invokes `jumpToFileAndLine()`, switching Monaco to the target file and centering the exact line.

### 4.2 Generic AI vs. Project RAG Comparison Mode
- Allows the researcher or mentor to compare:
  - **Generic AI:** Question → Local Ollama → Answer (Sources: None)
  - **Project RAG:** Question → ChromaDB Retrieval → Local Ollama → Answer (Sources: Project Files)
- Both conditions run on the **same local model**, isolating the scientific effect of retrieval augmentation.

### 4.3 AI Debug Workflow
1. Developer selects code or clicks **[ AI Debug ]**.
2. RAG retrieves related cross-file context and latest runtime error (`stderr`).
3. Synthesizes a structured report:
   - Suspected Issue
   - Location (`file:line`)
   - Root cause analysis
   - Cross-module evidence citations
   - Defensive remediation snippet

### 4.4 AI Test Generation Workflow
1. Developer clicks **[ Tests ]** for an active function.
2. System analyzes symbols and produces a complete unit test fixture tailored to the language (Vitest/Jest for JavaScript, PyTest for Python).

### 4.5 AI Patch Generation with Human Review
1. Developer requests a fix or optimization.
2. System generates a unified diff proposal (`diff`).
3. **Human-in-the-Loop Safety:** The file is **never** modified automatically. The developer reviews the diff and explicitly clicks:
   - **[ Apply Patch ]**: Automatically creates a version snapshot before updating Monaco.
   - **[ Reject ]**: Discards the patch proposal.

---

## 5. Telemetry & Research Benchmark Integration

Every AI interaction is logged to MongoDB in the `SessionEvent` collection:
```json
{
  "eventType": "AI_RESPONSE",
  "metadata": {
    "condition": "RAG",
    "provider": "ollama",
    "model": "qwen2.5-coder:1.5b",
    "fallback": false,
    "latencyMs": 1420,
    "llmLatencyMs": 1340,
    "sourcesCount": 3,
    "retrievedFiles": ["auth.controller.js", "User.js"],
    "experimentId": "EXP-BENCHMARK-001"
  }
}
```

---

## 6. Runtime Configuration & Local Setup

### 6.1 Requirements
- Python 3.10+
- Node.js 18+
- Ollama Daemon ([ollama.com](https://ollama.com))

### 6.2 Starting Services
1. **Start Ollama:**
   ```bash
   ollama serve
   ollama run qwen2.5-coder:1.5b
   ```
2. **Start Python AI Service:**
   ```bash
   cd ai_service
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. **Start Node.js Backend:**
   ```bash
   cd backend
   npm run dev
   ```
4. **Start React Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
