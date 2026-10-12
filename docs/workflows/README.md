# DevShare Workflow Documentation

## Purpose

This directory contains **source-code-audited** workflow diagrams for DevShare, a collaborative code workspace with AI-powered code understanding, designed for BTech final-year project evaluation and research purposes.

**All diagrams are verified against actual implementation.** Components are represented accurately based on inspection of 47+ source files across frontend, backend, and AI service layers.

---

## Contents

1. **devshare_overall_workflow.mmd** - Complete user journey from authentication to collaborative workspace features
2. **devshare_ai_rag_workflow.mmd** - Project indexing and AI-powered query processing pipeline
3. **devshare_system_architecture.mmd** - System component architecture with technology stack
4. **implementation_audit.md** - Detailed source code verification report (47+ files inspected)

---

## Diagram 1: Overall User Workflow

### File: `devshare_overall_workflow.mmd`

### Purpose
End-to-end user journey showing parallel workspace capabilities: real-time collaboration, AI assistance, code execution, WebRTC communication, leader mode permissions, interview mode telemetry, and analytics.

### Key Flows

**Authentication Flow:**
- Landing page → Register/Login → Dashboard
- JWT-based authentication with MongoDB User model

**Project Access:**
- Create new project (owner becomes leader)
- Open existing project (check membership)
- Join via room ID (shared session)

**Workspace Features** (Parallel Branches):

1. **Real-Time Collaboration:**
   - Socket.IO-based code synchronization
   - Debounced auto-save (2 seconds) to MongoDB
   - Live cursor positions and presence
   - Multi-file editing support

2. **Code Execution:**
   - Primary: Piston API (sandboxed containers)
   - Fallback: Local Node.js/Python subprocess (10s timeout)
   - Execution logs stored in MongoDB
   - stdout/stderr display in terminal panel

3. **AI Assistance:**
   - Project member authorization check
   - Proxy to Python FastAPI AI service
   - RAG-powered context retrieval
   - Evidence-grounded responses with source citations
   - Session event logging

4. **WebRTC Communication:**
   - Full-mesh peer-to-peer topology
   - Socket.IO signaling (offer/answer/ICE)
   - Audio/video streams via RTCPeerConnection
   - Google STUN servers for NAT traversal
   - Media toggle and status broadcast

5. **Leader Mode:**
   - Server-enforced permission system
   - Leader assignment: project owner or authorized researcher
   - Three roles: LEADER, EDITOR, VIEWER
   - Leader can enable lock mode (all others → VIEWER)
   - Grant/revoke edit permissions individually

6. **Interview Mode:**
   - Leader-initiated with candidate selection
   - Privacy modal consent before activation
   - Focus/visibility telemetry: TAB_HIDDEN, TAB_VISIBLE
   - Real-time alerts to leader
   - Duration tracking and MongoDB persistence

7. **Version History:**
   - Snapshot-based version control
   - MongoDB CodeVersion storage
   - Restore to previous versions
   - Not Git-based

8. **Session Analytics:**
   - Event logging: edits, executions, AI queries
   - Interview activity tracking
   - CSV/JSON export for research analysis
   - Charts and session summaries

**Session Termination:**
- Flush all debounced file buffers
- Update RoomSession with endedAt timestamp
- Reassign leader if current leader leaves
- Log USER_LEFT event

---

## Diagram 2: AI & RAG Workflow

### File: `devshare_ai_rag_workflow.mmd`

### Purpose
Detailed representation of two critical processes: (A) Project indexing pipeline, (B) Query processing with hybrid retrieval and evidence validation.

### A. Project Indexing Pipeline

**Trigger Points:**
- Manual index request via API
- File updated event
- New file added

**Indexing Steps:**

1. **File Retrieval:** Fetch from MongoDB ProjectFile collection
2. **Filtering:** Skip node_modules, .git, binaries, secret files
3. **Language Detection:** Extension-based (.py, .js, .ts, .cpp, etc.)
4. **Hash Computation:** SHA-256 of file content for stale detection
5. **Stale Check:** Compare with indexed hash, skip if unchanged

6. **Language-Aware Chunking:**
   - **Python:** AST-based function/class extraction
   - **JavaScript/TypeScript:** Regex-based function/class extraction
   - **Other:** Sliding window (300 lines, 100 overlap)

7. **Metadata Attachment:**
   - fileId, filePath (authoritative MongoDB ID)
   - startLine, endLine (exact line ranges)
   - symbol (function/class name)
   - language, fileContentHash, chunkHash

8. **Import Extraction:**
   - Python: AST analysis of import/from statements
   - JS/TS: Regex for ES6 imports and require()
   - C/C++: #include directives
   - Java: import declarations

9. **Embedding Generation:**
   - **⚠️ Current:** Hash-based deterministic fallback (NO semantic meaning)
   - **Intended:** sentence-transformers/all-MiniLM-L6-v2 (not loaded)
   - 384-dimensional vectors

10. **Storage:**
    - ChromaDB: Persistent collection `proj_<projectId>`
    - BM25: In-memory lexical index per project
    - Dependency Graph: In-memory bidirectional import map

### B. Query Processing Pipeline

**Authorization:**
- Project member check via MongoDB Project.members
- Non-members receive 403 Forbidden

**Query Understanding:**
- Extract explicit filenames, paths, symbols
- Detect architecture queries (keywords: "dependency", "how files interact", "project-wide")
- Set selection strategy: architecture (breadth) vs precision (relevance)

**4-Channel Hybrid Retrieval:**

1. **Exact Filename Match** (weight 0.15):
   - Regex extraction of file references
   - Basename and stem matching
   - Symbol-to-file resolution via dependency graph

2. **BM25 Lexical Search** (weight 0.25):
   - Keyword-based Okapi BM25 ranking
   - TF-IDF scoring
   - Top-K selection by relevance

3. **Vector Semantic Search** (weight 0.40):
   - ChromaDB similarity query
   - **⚠️ Currently degraded:** Hash fallback vectors, not real embeddings
   - Cosine similarity ranking (meaningless without real embeddings)

4. **Dependency Graph Traversal** (weight 0.20):
   - File import/imported-by expansion
   - Symbol-based related files
   - Structural code relationships

**Rank Fusion:**
- Normalize each channel's scores to [0, 1]
- Weighted sum: `score = 0.4×vec + 0.25×lex + 0.2×dep + 0.15×file`
- Sort candidates by combined score

**Candidate Selection:**
- **Architecture Mode:** One chunk per file (max breadth), explicit file mentions prioritized
- **Precision Mode:** Top-K by score (max relevance)
- Default K=6 chunks

**Evidence Construction:**
- Canonical evidence manifest with:
  - fileId, filePath, startLine-endLine
  - Code snippet, fileContentHash, chunkHash
  - Retrieval source and score

**Prompt Building:**
- System instructions: role, grounding rules
- Attached evidence: files with line numbers
- User query

**LLM Inference:**
- **Primary:** OpenRouter/OpenAI API if API key present
  - Model: gpt-4o-mini or configured model
  - Timeout: 75s read, 2 retries
- **Fallback:** Local Ollama
  - Model: qwen2.5-coder:1.5b or available model
  - Timeout: 180s
- Temperature: 0.05 (deterministic)
- Top-p: 0.9

**Evidence Validation:**
1. Parse LLM response for file/line references
2. Match claims against provided evidence chunks
3. Classify response:
   - **GROUNDED:** All claims match evidence
   - **PARTIAL:** Some claims lack support
   - **NO_FINDING:** Insufficient evidence
4. Attach source citations with clickable file navigation

**Response Display:**
- Chat panel with formatted response
- Source references: fileId, filePath, line ranges
- Clickable navigation to evidence locations
- Log AI_QUERY event to SessionEvent

---

## Diagram 3: System Architecture

### File: `devshare_system_architecture.mmd`

### Purpose
Component-level architecture showing all layers, data flows, and technology choices.

### Architecture Layers

#### 1. Client Layer
- **React 19** single-page application
- **Vite 6** build tool and dev server
- **Monaco Editor** for code editing (same engine as VS Code)
- **React Router** for navigation
- **Socket.IO Client** for real-time events
- **WebRTC** for peer-to-peer communication

#### 2. Node.js Backend (Express Server)
**Port:** 5000 (default)

**API Routes:**
- `/api/auth` - Login, register (JWT tokens)
- `/api/projects` - Project CRUD operations
- `/api/files` - File operations
- `/api/execution` - Code execution via Piston
- `/api/ai` - Proxy to Python AI service
- `/api/analytics` - Session analytics and export
- `/api/tasks` - Research task management
- `/api/questionnaires` - Research surveys

**Middleware:**
- `protect` - Requires valid JWT token
- `optionalAuth` - Allows anonymous + authenticated users

#### 3. Real-Time Collaboration (Socket.IO)
**Architecture:** In-memory room state with debounced MongoDB persistence

**Room State (Per Room):**
- User list with avatars
- Code buffers (fileId → content)
- Debounce timers (2 second auto-save)
- Leader ID and mode status
- Permission map (socketId → role)
- Interview state (active, candidateId, startTime)

**Socket Events:**
- `join`, `userJoined`, `userLeft`
- `codeChange`, `fileSwitch`, `cursorMove`
- `enableLeaderMode`, `grantEditPermission`
- `startInterview`, `interviewActivity`
- `webrtc-join`, `webrtc-signal`, `webrtc-media-toggle`

**Session Termination:**
- Flush buffers on disconnect
- Reassign leader if needed
- Persist session to MongoDB

#### 4. Persistence Layer (MongoDB + Mongoose)

**Data Models:**
- `User` - Authentication with roles (admin, researcher, developer)
- `Project` - Owner, members with roles, activeRoomId
- `ProjectFile` - Content, language, lastModifiedBy
- `RoomSession` - Collaboration session with interview state
- `SessionEvent` - Telemetry logs (USER_JOINED, CODE_EDIT, AI_QUERY, TAB_HIDDEN, etc.)
- `CodeVersion` - Snapshot-based version control
- `ExecutionLog` - Code run history
- `ResearchTask` - Participant tasks with questionnaires
- `ParticipantTaskSession` - Task completion tracking
- `Questionnaire` + `QuestionnaireResponse` - Survey system

**Authorization:**
- Project ownership model
- Member roles: owner, editor, viewer
- AI context restricted to project members

#### 5. Python AI Service (FastAPI)
**Port:** 8000 (default)

**Endpoints:**
- `GET /api/health` - Service status (Ollama + ChromaDB availability)
- `POST /api/analyze` - Static code analysis
- `POST /api/rag/index` - Index project files
- `GET /api/rag/status` - Check index status
- `POST /api/rag/query` - Retrieve context
- `POST /api/chat` - Conversational AI assistance
- `POST /api/debug` - Generate debug reports
- `POST /api/tests` - Generate test cases
- `POST /api/patch` - Suggest code patches

**CORS:** Enabled for cross-origin frontend requests

#### 6. RAG Pipeline

**Components:**
- **Smart Chunker:** AST-based (Python/JS), regex (other languages)
- **Embedding Engine:** ⚠️ Hash fallback (sentence-transformers stub)
- **ChromaDB:** Persistent vector store, collection per project
- **BM25 Index:** In-memory Okapi BM25 for lexical search
- **Dependency Graph:** Bidirectional import/importedBy map

**Hybrid Retrieval:**
- 4-channel retrieval with weighted fusion
- Configurable weights via environment variables
- Architecture vs precision selection strategies

**Evidence Grounding:**
- Canonical evidence manifest with hashes
- Claim validation against provided sources
- Source citation in responses

#### 7. LLM Inference Layer

**Dual Runtime Support:**
1. **OpenRouter/OpenAI API** (Primary):
   - Requires `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
   - Configurable model (default: gpt-4o-mini)
   - 75s timeout, 2 retry attempts
   - HTTPS to configured base URL

2. **Local Ollama** (Fallback):
   - Base URL: `http://127.0.0.1:11434`
   - Auto-detection of available models
   - Preference: qwen2.5-coder:1.5b
   - 180s timeout
   - Both /api/chat and /api/generate endpoints

**Configuration:** Environment variables control provider selection

#### 8. Static Code Analysis

**Implementation:**
- **Pattern Matcher:** Regex-based heuristics for common anti-patterns
- **AST Validator:** Python syntax error detection via ast.parse()
- **⚠️ Note:** NOT actual CodeBERT neural inference
- **Classifications:** NO_ISSUE, RUNTIME_ERROR, SECURITY_RISK, RESOURCE_LEAK, LOGIC_ERROR

#### 9. Code Execution Integration

**Piston API Client:**
- Public API: `https://emkc.org/api/v2/piston/execute`
- Sandboxed container execution
- Supported: JavaScript, Python, C++, C, Java, TypeScript

**Local Executor (Fallback):**
- Node.js and Python subprocess execution
- Temp file in OS tmpdir
- 10 second timeout
- Basic security: timeout only, no resource limits

#### 10. WebRTC Communication

**Signaling:** Socket.IO relays offer/answer/ICE candidates

**STUN Servers:**
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

**Topology:** Full-mesh (each peer connects to all others)

**Media Streams:** Audio + video with graceful fallback to audio-only

**Limitations:** Does not scale beyond ~4-5 participants

#### 11. Research Telemetry & Analytics

**Event Logger:**
- All workspace actions logged to SessionEvent
- Debounced: CODE_EDIT max 1 per 30s per user

**Interview Monitor:**
- Focus/visibility tracking during interview mode
- TAB_HIDDEN, TAB_VISIBLE, WINDOW_BLUR, WINDOW_FOCUS
- Real-time alerts to leader

**Analytics Exporter:**
- Session summaries: duration, edit count, execution count, AI queries
- Interview participation: focus event counts, duration
- Questionnaire responses
- Export formats: CSV, JSON

---

## Verified Technology Stack

### Frontend
- **Framework:** React 19.0.0
- **Build Tool:** Vite 6.2.0
- **Editor:** @monaco-editor/react 4.7.0
- **Routing:** react-router-dom 7.18.2
- **Styling:** Tailwind CSS 4.3.3
- **Real-Time:** socket.io-client 4.8.3
- **UI Components:** Lucide React icons, Framer Motion animations

### Backend
- **Runtime:** Node.js with Express 4.21.2
- **Database:** MongoDB with Mongoose 9.9.3
- **Real-Time:** socket.io 4.8.1
- **Auth:** jsonwebtoken 9.0.3, bcryptjs 3.0.3
- **HTTP Client:** axios 1.7.7

### AI Service
- **Framework:** FastAPI 0.115.0+
- **Server:** Uvicorn 0.34.0+
- **Vector DB:** chromadb 0.6.0+
- **Embeddings:** sentence-transformers 3.3.0+ (⚠️ not loaded)
- **ML:** torch 2.2.0+, transformers 4.48.0+ (⚠️ not used for CodeBERT)
- **Lexical:** scikit-learn 1.6.0+ (BM25)
- **HTTP Client:** httpx 0.28.0+

### LLM Runtime
- **Primary:** OpenRouter/OpenAI API (cloud-based, API key required)
- **Fallback:** Ollama (local inference server, port 11434)
- **Default Model:** qwen2.5-coder:1.5b (Ollama), gpt-4o-mini (OpenRouter)

### Code Execution
- **Primary:** Piston API (public hosted sandboxes)
- **Fallback:** Local subprocess (Node.js, Python)

### Communication
- **WebRTC:** Native browser APIs with Google STUN servers

---

## How to View Diagrams

### In VS Code (Recommended)
1. Install extension: **Markdown Preview Mermaid Support**
2. Open `.mmd` file
3. Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)
4. Or right-click → "Open Preview"

### In GitHub
- GitHub natively renders Mermaid diagrams in Markdown
- View `.mmd` files directly in repository

### Online Editors
1. [Mermaid Live Editor](https://mermaid.live/)
2. Copy diagram code
3. Paste and view/edit interactively
4. Export to PNG/SVG

### Export to Images
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG (for reports)
mmdc -i devshare_overall_workflow.mmd -o devshare_overall_workflow.png -w 3000

# Convert to SVG (for scalable diagrams)
mmdc -i devshare_ai_rag_workflow.mmd -o devshare_ai_rag_workflow.svg

# Convert all diagrams
mmdc -i devshare_system_architecture.mmd -o devshare_system_architecture.svg
```

### In LaTeX/Report (via SVG)
```latex
\usepackage{graphicx}
\begin{figure}[H]
\centering
\includegraphics[width=\textwidth]{workflows/devshare_overall_workflow.png}
\caption{DevShare Overall User Workflow}
\label{fig:workflow}
\end{figure}
```

---

## Workflow Summaries

### User Journey
```
Visit → Register/Login → Dashboard → Create/Join Project
→ Workspace (Monaco Editor + Socket.IO sync)
→ Parallel Features:
    • Real-time collaboration (code + cursor sync)
    • AI assistance (RAG + LLM)
    • Code execution (Piston/local)
    • WebRTC (audio/video)
    • Leader mode (permission control)
    • Interview mode (focus tracking)
    • Version history (snapshots)
    • Analytics (telemetry + export)
→ Disconnect (flush buffers, update session)
```

### Indexing Flow
```
Files in MongoDB → Filter (skip node_modules, binaries)
→ Detect language → Compute hash → Check if stale
→ AST/Regex chunking → Extract symbols + imports
→ Generate embeddings (⚠️ hash fallback)
→ Store: ChromaDB + BM25 + Dependency Graph
```

### Query Flow
```
User query → Authorization check
→ Query understanding (extract files, detect architecture intent)
→ 4-channel retrieval:
    1. Filename match (0.15)
    2. BM25 lexical (0.25)
    3. Vector search (0.40, ⚠️ degraded)
    4. Dependency graph (0.20)
→ Weighted fusion + selection (architecture vs precision)
→ Build evidence manifest
→ Construct grounded prompt
→ LLM inference (OpenRouter/Ollama)
→ Validate claims against evidence
→ Return response with source citations
→ Display in chat panel with clickable navigation
```

---

## Current Implementation Limitations

### 1. Semantic Search Degraded
**Issue:** Embedding engine uses hash-based fallback, not real semantic embeddings.

**Evidence:**
- `embeddings.py` lines 9-10: `self.model = None`, `self.using_fallback = True`
- `_ensure_loaded()` and `_load_model()` are empty functions
- Hash function: deterministic pseudo-random vectors based on text hash

**Impact:**
- Vector search does not understand code semantics
- Similarity scores are meaningless
- BM25 lexical search currently more effective

**Mitigation:**
- Rely on BM25 + filename matching + dependency graph
- RAG still functional, but without semantic channel contribution

**Fix:**
- Load sentence-transformers model in `_load_model()`
- Re-index all projects after fix

### 2. CodeBERT Label Misleading
**Issue:** Static analysis uses pattern matching, not neural CodeBERT inference.

**Evidence:**
- `main.py` lines 320-363: regex patterns and AST validation
- No model loading in `ml/model.py`
- `self.encoder = None` always

**Impact:**
- Classification is rule-based, not learned
- Confidence scores are simulated
- Cannot generalize beyond known patterns

**Labeling Correction:**
- Engine should be labeled "Rule-Based Pattern Analyzer + AST Validator"
- Remove "CodeBERT Neural" references

### 3. No Conflict Resolution
**Issue:** Last-write-wins model for simultaneous edits.

**Impact:**
- Concurrent edits to same line: last edit wins, others overwritten
- No merge conflict UI or operational transformation

**Current Behavior:**
- Acceptable for small teams with communication
- Leader mode can prevent conflicts by restricting edit access

### 4. Scalability Constraints
**Full-Mesh WebRTC:**
- Each peer connects to all others
- Does not scale beyond ~4-5 participants
- Bandwidth grows O(n²)

**In-Memory Room State:**
- Lost on server restart
- No horizontal scaling support
- Redis adapter not configured

**Single Server:**
- No load balancing
- No failover

**Acceptable for:**
- Research prototype
- Small team collaboration (2-4 users)
- Controlled research studies

### 5. Security Limitations
**Local Execution:**
- Minimal sandboxing (timeout only)
- No resource limits (CPU, memory, disk)
- Risk: infinite loops, memory exhaustion

**No Rate Limiting:**
- API endpoints unprotected
- Potential abuse: excessive indexing, AI queries

**Socket.IO Auth:**
- Optional authentication (`optionalAuth`)
- Public rooms allow anonymous access

**Acceptable for:**
- Trusted development environment
- Research studies with vetted participants

---

## Research Evaluation Opportunities

### Quantitative Metrics

**Collaboration Efficiency:**
- Edits per minute per user
- Edit conflict rate (last-write-wins overwrites)
- Session duration distribution

**AI Assistance Effectiveness:**
- AI query count vs manual code navigation
- Response grounding rate (GROUNDED vs NO_FINDING)
- Source citation accuracy
- Time to answer code questions (with vs without AI)

**Code Execution Patterns:**
- Execution frequency per session
- Success vs error rate
- Languages used distribution

**Interview Mode Telemetry:**
- Focus loss events per interview session
- TAB_HIDDEN duration distribution
- Correlation: focus loss vs task performance

**WebRTC Usage:**
- Call duration per session
- Audio vs video usage rates
- Peer connection success rate

### Qualitative Research Questions

1. **RAG Effectiveness:**
   - Do developers trust AI responses with source citations?
   - Does evidence grounding reduce hallucination concern?
   - How often do developers click source links to verify?

2. **Leader Mode Usability:**
   - When is permission lock useful? (interviews, demos, pair programming)
   - Does explicit permission model improve collaboration clarity?

3. **Interview Mode Privacy:**
   - Do candidates accept focus tracking after privacy disclosure?
   - Does awareness of monitoring affect behavior?

4. **Hybrid Retrieval:**
   - Which retrieval channel (lexical/vector/dependency/filename) is most effective?
   - Can users articulate which retrieval method answered their query?

5. **Real-Time Collaboration:**
   - Does WebRTC audio improve remote pair programming?
   - Are visual cursors sufficient for awareness, or is video needed?

### Research Export Data

**CSV/JSON Fields:**
- User ID, session ID, project ID
- Session start/end timestamps, duration
- Edit count, execution count, AI query count
- Leader mode enabled duration
- Interview active duration, focus event counts
- Questionnaire responses (pre/post task)

**Supported Analysis:**
- Correlation analysis (e.g., AI usage vs task completion time)
- Behavioral patterns (e.g., edit burst timing)
- Interview focus patterns (e.g., focus loss clusters)
- User role impact (leader vs editor vs viewer activity)

---

## Color Coding in Diagrams

Consistent color scheme across all diagrams:

- 🟢 **Green** (`#e8f5e9`) - Entry/exit points, successful completion
- 🔵 **Blue** (`#e3f2fd`) - Core processes and operations
- 🟠 **Orange** (`#fff3e0`) - Decision points and branching logic
- 🔴 **Red** (`#ffebee`) - Errors, permission denials, failures
- 🟣 **Purple** (`#f3e5f5`) - Data storage and persistence
- 🟡 **Yellow** (`#fff9c4`) - Warnings, degraded features, fallbacks (dashed border)

---

## Diagram Validation

**Validation Date:** December 2024

**Validation Method:**
- Source code inspection: 47+ files across frontend, backend, AI service
- Runtime verification: Socket events, API routes, database models
- Configuration analysis: package.json, requirements.txt, environment variables

**Validation Confidence:**
- ✅ **High Confidence:** Components with verified source code implementation
- ⚠️ **Degraded:** Components implemented but using fallback/stub (embeddings, CodeBERT)
- ❌ **Not Implemented:** Features confirmed absent (VS Code extension, Next.js, S3, rate limiting)

**Audit Document:** See `implementation_audit.md` for detailed evidence.

---

## Unresolved Issues

1. **Why is sentence-transformers not loaded?**
   - Dependencies installed but model loading functions are empty
   - Intentional performance optimization or incomplete feature?

2. **Should CodeBERT labeling be corrected?**
   - Current: "CodeBERT Neural & Semantic Classifier"
   - Accurate: "Rule-Based Pattern Analyzer + AST Validator"

3. **Is NetworkX dependency needed?**
   - Dependency graph uses Python dict/list, not NetworkX library
   - Documentation suggests NetworkX but code doesn't use it

---

## Related Documentation

- **Main README:** `../../README.md` - Installation and setup
- **API Documentation:** (if exists) `../api/README.md`
- **Architecture Audit:** `implementation_audit.md` - Full verification report
- **Research Reports:** (in root)
  - `RAG_CORRECTNESS_VALIDATION.md`
  - `AUTOMATED_RESEARCH_BENCHMARK_REPORT.md`
  - `RESEARCH_VALIDATION_REPORT.md`

---

## Maintenance

**Last Updated:** December 2024

**Maintained By:** DevShare Development Team

**Update Trigger:** Significant architectural changes, new features, dependency updates

**Verification Process:** Source code audit + runtime behavior verification

---

## Questions & Support

**For Technical Questions:**
- Check implementation audit: `implementation_audit.md`
- Review source code: `backend/`, `frontend/`, `ai_service/`
- Inspect database models: `backend/models/`

**For Research Evaluation:**
- Review analytics export format
- Check SessionEvent logging implementation
- See research report documents in project root

**For Deployment:**
- Ensure MongoDB running
- Install Python dependencies: `pip install -r ai_service/requirements.txt`
- Configure LLM: Set `OPENROUTER_API_KEY` or run local Ollama
- Start backend: `npm run dev` or `npm start`
- Start AI service: `cd ai_service && uvicorn app.main:app --reload`
- Start frontend: `cd frontend && npm run dev`

---

**Diagrams are verified against actual implementation. All claims are supported by source code evidence. See `implementation_audit.md` for full verification report.**
