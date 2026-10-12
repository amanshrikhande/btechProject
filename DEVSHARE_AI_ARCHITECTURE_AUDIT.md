# DevShare AI Architecture Audit (Phase 0)

**Date:** 2026-09-21  
**Author:** Pair Programming Agent & DevShare Core Team  
**Scope:** Pre-Implementation Comprehensive Audit of DevShare AI, RAG, Collaboration, and LLM Provider Separation.

---

## 1. Executive Summary & Critical Separation Principle

### 1.1 Antigravity Development Assistant vs. DevShare Runtime AI
- **Antigravity Development Assistant (Gemini):** Used **solely** as the external pair-programming assistant to analyze, edit, and audit code in this repository. 
- **DevShare Runtime AI:** The embedded AI coding assistant inside DevShare. It **must exclusively use local Ollama** (defaulting to `qwen2.5-coder:1.5b` or `deepseek-coder`).
- **Separation Guarantee:**
  - Gemini SDKs, Google Generative AI endpoints, Gemini API keys, or Google Gemini cloud references are **strictly prohibited** in DevShare runtime code.
  - Zero project source code or user data will ever be transmitted to Gemini at runtime.
  - Gemini will NOT be used as a fallback, alternative model, or experimental condition.

---

## 2. Current Architecture Inventory

### 2.1 Repository Structure
```
DevShare/
├── ai_service/                # Python FastAPI Microservice (:8000)
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   ├── llm/              # Ollama client & prompt builder
│   │   ├── ml/               # CodeBERT training & inference
│   │   ├── rag/              # chunker, embeddings, vectorstore
│   │   ├── config.py         # App configurations
│   │   └── main.py           # FastAPI application entrypoint
│   └── requirements.txt      # Python dependencies
├── backend/                  # Node.js Express & Socket.IO (:5000)
│   ├── config/               # MongoDB & port configs
│   ├── controllers/          # AI, Auth, Projects, Tasks, Analytics
│   ├── models/               # Mongoose schemas (User, Project, ProjectFile, SessionEvent, etc.)
│   ├── routes/               # Express routers (/api/ai, /api/projects, /api/analytics, etc.)
│   ├── services/             # Piston code execution service
│   ├── sockets/              # Real-time WebSockets (socketManager.js)
│   └── index.js              # Server entry point
├── frontend/                 # React 18 + Vite SPA (:5173)
│   ├── src/
│   │   ├── api/              # Axios API clients (ai.api.js, projects.api.js)
│   │   ├── components/ai/    # AIAssistantDrawer, MLDefectBadge, RAGSnippetsViewer, MarkdownMessage
│   │   ├── components/workspace/ # MonacoEditorWrapper, FileTree, TerminalPanel, etc.
│   │   ├── context/          # WorkspaceContext, SocketContext, AuthContext
│   │   └── pages/            # WorkspacePage, DashboardPage, LandingPage
└── test/                     # Automated Research Benchmark & Validation
    ├── research_benchmark/   # Experiments A & B (Collaboration, Security, AI/RAG)
    └── research_validation/  # Ground truth and statistical verification scripts
```

### 2.2 Existing AI & RAG Pipeline Flow
1. **Frontend Trigger:** User types a query or clicks an action chip in [`frontend/src/components/ai/AIAssistantDrawer.jsx`](frontend/src/components/ai/AIAssistantDrawer.jsx).
2. **Node.js Forwarder:** Calls [`backend/controllers/ai.controller.js`](backend/controllers/ai.controller.js) (`POST /api/ai/chat`), which creates an audit record in `SessionEvent` and forwards the request to `http://127.0.0.1:8000/api/chat`.
3. **Python AI Microservice:**
   - **RAG Step:** `main.py` checks `_project_index` or queries ChromaDB (`./chroma_db`) for code chunks matching the query keywords or vector embeddings.
   - **ML Step:** Scans active code using CodeBERT structural & hazard patterns.
   - **LLM Step:** Calls local Ollama server at `http://127.0.0.1:11434` with context and system prompts.
   - **Fallback:** If Ollama is offline, returns structured heuristic analysis (syntax explanation, bug analysis, test fixture) with `fallback: true`.

---

## 3. Findings & Detailed Component Audit

### 3.1 LLM Provider Analysis
- **Current Provider:** Local Ollama (`qwen2.5-coder:1.5b` or other locally installed Ollama models).
- **Residual Gemini Leakage Identified in `main.py`:**
  - Lines 5, 76, 150-170 in `ai_service/app/main.py` contained dead/optional code attempting to query `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash` if `GEMINI_API_KEY` was passed.
  - In `AIAssistantDrawer.jsx`, a settings input allowed pasting a "Gemini / Groq API Key".
  - **Resolution:** These will be completely excised in Phase 23. Runtime DevShare will strictly rely on local Ollama, with an honest fallback status when Ollama is offline.

### 3.2 Embedding & Vector Store Audit
- **Current Vector Store:** ChromaDB (`chromadb.PersistentClient(path="./chroma_db")`).
- **Current Embedding:** ChromaDB built-in / `all-MiniLM-L6-v2` / deterministic embedding fallback in [`ai_service/app/rag/embeddings.py`](ai_service/app/rag/embeddings.py).
- **Chunking Audit:**
  - `ai_service/app/rag/chunker.py` contains a sliding-window line-based chunker.
  - However, `main.py` lines 580-600 used an ad-hoc 500-character chunking loop during `POST /api/rag/index`.
  - **Improvement Target:** Upgrade to true code-aware chunking (functions, classes, blocks, lines with symbols) with complete metadata (`projectId`, `fileId`, `fileName`, `filePath`, `language`, `symbol`, `symbolType`, `startLine`, `endLine`, `chunkIndex`).

### 3.3 Request & Response Schemas
- **`POST /api/ai/rag/index`:**
  - Input: `{ projectId: string, files: [{ fileId, fileName, filePath, language, content }] }`
  - Output: `{ success: true, indexed: number, files: number, projectId: string, chromadb: boolean }`
- **`POST /api/ai/rag/query`:**
  - Input: `{ projectId: string, query: string, topK?: number }`
  - Output: `{ chunks: [{ fileName, filePath, startLine, endLine, content, score, symbol }], count: number, source: string }`
- **`POST /api/ai/chat`:**
  - Input: `{ message, projectId, activeFileName, activeCode, language, lastError, chatHistory, condition?: 'GENERIC' | 'RAG' }`
  - Output: `{ response, ml_analysis, retrieved_context, latency_ms, engine, condition, sources, retrievalMetadata }`
- **`GET /api/ai/health`:**
  - Output: `{ success: true, status: 'online' | 'offline', provider: 'ollama', model: string, available: boolean, chromadb: object }`

### 3.4 Research Benchmark & Telemetry Infrastructure
- The existing research benchmark (`test/research_benchmark/run_research_benchmark.js` & `runners/ai_runner.js`) runs 20 standardized questions across `AUTOMATED_GENERIC_AI` vs `AUTOMATED_RAG_AI`.
- It relies directly on:
  - `POST /api/rag/query` with `top_k: 5`
  - `POST /api/chat`
  - Evaluation metrics: `Hit@1`, `Hit@3`, `Hit@5`, `MRR`, `Recall`, `latency`.
- **Preservation Mandate:** Any change to `/api/rag/query` or `/api/chat` **must remain backwards compatible** with `ai_runner.js`.

---

## 4. Plan for Modifications & Safe Boundaries

### 4.1 Files to Modify
1. `ai_service/app/main.py`:
   - Enforce code-aware chunking integration.
   - Remove all Gemini cloud calls; strictly standardize on Local Ollama.
   - Return rich retrieval metadata (`sources`, `retrievalMetadata`, actual cosine distances/scores, line citations).
   - Add `/api/ai/rag/status/:projectId` and re-index endpoints.
   - Implement `AI Debug`, `Test Generation`, and `Patch Generation` endpoints.
2. `ai_service/app/rag/chunker.py`:
   - Enhance code-aware AST/regex parser for JS/TS/Python/C++/Java (identifying function definitions, classes, interfaces, startLine, endLine, symbol).
3. `ai_service/app/rag/vectorstore.py`:
   - Strengthen project-isolated collection management (`proj_<projectId>`), genuine distance-to-similarity conversion (`1 / (1 + distance)`), and candidate accounting.
4. `backend/controllers/ai.controller.js` & `backend/routes/ai.routes.js`:
   - Proxy new RAG status and patch/debug endpoints.
   - Enrich `SessionEvent` logging with detailed research experiment telemetry.
5. `frontend/src/api/ai.api.js`:
   - Expose index status, re-indexing, generic vs RAG query, debug, and patch APIs.
6. `frontend/src/components/ai/AIAssistantDrawer.jsx`:
   - Add Mode switcher: `[ Project RAG ▼ ]` vs `[ Generic AI ]`.
   - Add "Show Evidence" panel (`RAGEvidencePanel`) with file links and line badges that trigger Monaco navigation.
   - Add "Project Knowledge" section (indexed files, chunks, collection status, Re-index button).
   - Add "Compare AI" side-by-side demonstration modal/view.
   - Add "AI Architecture View" showing the pipeline explicitly labeled "DevShare Runtime AI — Powered by local Ollama".
   - Add AI Debug, Test Generator, and Patch Review (`[Apply Patch]` / `[Reject]`) with human-in-the-loop protection.
7. `frontend/src/context/WorkspaceContext.jsx` & `MonacoEditorWrapper.jsx`:
   - Provide helper `navigateToLocation(filePath, startLine)` so clicking citations automatically opens the file and scrolls Monaco to the exact line.

### 4.2 Files NOT to Modify (Preserved Integrity)
- `backend/models/User.js`, `backend/models/Project.js`, `backend/models/ProjectFile.js`, `backend/models/RoomSession.js`.
- `backend/sockets/socketManager.js` (Leader mode, WebRTC signals, interview locks, collaborative editing).
- `backend/services/piston.service.js` (Native code execution engine).
- `frontend/src/context/SocketContext.jsx` & `AuthContext.jsx`.
- Existing research task & questionnaire controllers (`task.controller.js`, `questionnaire.controller.js`).

---

## 5. Compatibility & Security Risks
| Risk | Mitigation |
| :--- | :--- |
| **Breaking Existing Research Benchmarks** | Maintain exact JSON response fields (`chunks`, `response`) while augmenting with new fields (`sources`, `retrievalMetadata`). |
| **Project Cross-Contamination** | Strict collection isolation (`proj_<projectId>`). Project A collection cannot be queried by Project B. |
| **Ollama Offline during Benchmarking** | Never silently substitute heuristic fallback as "real LLM". Mark response `available: false`, `AI_STATUS: NOT_READY` so benchmarks do not misrepresent synthetic text as model output. |
| **Accidental File Overwrite by AI** | Strict Human-in-the-Loop policy: AI only generates unified diff / proposed changes. Monaco / MongoDB persistence only occurs when user clicks **[ Apply Patch ]**. |
| **Gemini Infiltration** | Complete purge of all `generativelanguage.googleapis.com` calls and `GEMINI_API_KEY` configuration from DevShare runtime. |
