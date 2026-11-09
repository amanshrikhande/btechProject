# DevShare — Complete System Architecture

**Version:** 1.0  
**Last Updated:** January 2026  
**Project Type:** Real-time Collaborative Code Editor with AI-Powered RAG Assistant  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Communication Protocols](#communication-protocols)
7. [Security Architecture](#security-architecture)
8. [Persistence Layer](#persistence-layer)
9. [AI & RAG Pipeline](#ai--rag-pipeline)
10. [Real-time Collaboration](#real-time-collaboration)
11. [Research & Analytics](#research--analytics)
12. [Deployment Architecture](#deployment-architecture)
13. [Design Decisions & Rationale](#design-decisions--rationale)

---

## System Overview

### What is DevShare?

DevShare is a **browser-based collaborative coding platform** with three core capabilities:

1. **Real-time Code Collaboration** — Multiple users edit the same file simultaneously with instant synchronization
2. **Code Execution** — Run code in JavaScript, Python, C++, Java, TypeScript via remote sandbox (Piston API)
3. **AI-Powered Code Assistant** — Context-aware chatbot using Retrieval-Augmented Generation (RAG) to answer questions grounded in the project's actual source code

### Primary Use Cases

- **Software Development Teams** — Pair programming, code reviews, mob programming sessions
- **Academic Research** — Study collaboration patterns, AI assistance effectiveness, developer behavior
- **Technical Interviews** — Remote coding interviews with telemetry (focus tracking, permission control)
- **Education** — Live coding demonstrations, student collaboration on assignments

### Architecture Style

**Multi-tier service-oriented architecture** with three independent services:

```
┌─────────────────┐
│  Browser Client │  ← React SPA (Tier 1)
└────────┬────────┘
         │ HTTP/WebSocket
┌────────▼────────┐
│  Node.js Gateway│  ← Express + Socket.IO (Tier 2)
│   + MongoDB     │
└────────┬────────┘
         │ HTTP
┌────────▼────────┐
│ Python AI Service│ ← FastAPI + ChromaDB (Tier 3)
└─────────────────┘
```

---

## Technology Stack

### Tier 1: Frontend (Browser Client)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.0.0 | UI framework, component composition |
| **Vite** | 6.0.7 | Build tool, dev server, hot module replacement |
| **Tailwind CSS** | 4.0.0 | Utility-first styling, responsive design |
| **Monaco Editor** | 0.52.2 | In-browser code editor (VS Code engine) |
| **Socket.IO Client** | 4.8.1 | WebSocket communication for real-time sync |
| **Axios** | 1.7.9 | HTTP client for REST API calls |
| **React Router DOM** | 7.1.1 | Client-side routing |
| **React Markdown** | 9.0.2 | Markdown rendering for AI responses |
| **Framer Motion** | 12.0.2 | Animations and transitions |
| **simple-peer** | 9.11.1 | WebRTC peer connections (audio/video) |

**Build Output:** Static files served by Vite dev server (dev) or Nginx (production)

### Tier 2: Backend Gateway (Node.js)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime (ES modules) |
| **Express** | 4.21.2 | HTTP server, REST API routing |
| **Socket.IO** | 4.8.1 | WebSocket server for real-time events |
| **Mongoose** | 9.0.5 | MongoDB ODM, schema validation |
| **bcryptjs** | 2.4.3 | Password hashing (10 rounds) |
| **jsonwebtoken** | 9.0.2 | JWT signing and verification |
| **Axios** | 1.7.9 | HTTP client to AI service & Piston |
| **cors** | 2.8.5 | Cross-origin resource sharing |
| **dotenv** | 16.4.7 | Environment variable management |

**Runtime:** `node backend/index.js` on port 5000

### Tier 3: AI Service (Python)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Language runtime |
| **FastAPI** | 0.115.12 | Async HTTP framework |
| **Uvicorn** | 0.34.2 | ASGI server |
| **ChromaDB** | 0.6.5 | Vector database for embeddings |
| **sentence-transformers** | 3.3.1 | Text embedding model loader |
| **torch** | 2.2.2+cpu | PyTorch (CPU-only, for embeddings) |
| **httpx** | 0.28.1 | Async HTTP client (LLM API calls) |
| **Pydantic** | 2.10.6 | Data validation, settings management |
| **scikit-learn** | 1.6.1 | Cosine similarity, metrics |
| **numpy** | 2.2.2 | Numerical operations |

**Runtime:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Data Persistence

| Technology | Version | Purpose |
|------------|---------|---------|
| **MongoDB** | 6.0+ | Primary database (documents) |
| **ChromaDB** | 0.6.5 | Vector database (embeddings) |
| **File System** | N/A | ChromaDB persistence (`./chroma_db`) |

### External Services

| Service | Purpose |
|---------|---------|
| **Piston API** | Code execution sandbox (emkc.org) |
| **OpenRouter API** | LLM provider (gpt-4o-mini) |
| **Ollama** (fallback) | Local LLM (qwen2.5-coder:1.5b) |

---

## Architecture Layers

### Layer 1: Presentation Layer (Browser)

**Location:** `frontend/src/`

**Responsibilities:**
- Render UI components (Monaco editor, file tree, terminal, AI chat)
- Handle user interactions (typing, clicking, file operations)
- Manage client-side state (open files, active tabs, code buffers)
- Establish WebSocket connection for real-time sync
- Display execution results and AI responses

**Key Files:**
- `App.jsx` — Root component, routing, context providers
- `pages/WorkspacePage.jsx` — Main IDE layout
- `context/AuthContext.jsx` — JWT authentication state
- `context/SocketContext.jsx` — Socket.IO connection management
- `context/WorkspaceContext.jsx` — File tree, active file, code buffer
- `components/workspace/MonacoEditorWrapper.jsx` — Code editor integration
- `components/ai/AIAssistantDrawer.jsx` — RAG chat interface

**State Management:** React Context API (no Redux/Zustand)

**Communication:**
- REST API calls via Axios (CRUD operations)
- WebSocket via Socket.IO (real-time code changes, presence, execution)
- WebRTC via simple-peer (audio/video peer-to-peer)

---

### Layer 2: Application Layer (Node.js Gateway)

**Location:** `backend/`

**Responsibilities:**
- Authenticate users (JWT-based)
- Manage projects, files, versions (CRUD operations)
- Coordinate real-time collaboration (broadcast code changes)
- Proxy code execution requests to Piston API
- Proxy AI requests to Python service
- Log session events for research analytics
- Enforce leader mode permissions
- Handle WebRTC signaling relay

**Key Files:**
- `index.js` — Express server initialization, Socket.IO setup
- `routes/*.routes.js` — REST endpoint definitions (9 route files)
- `controllers/*.controller.js` — Business logic (9 controllers)
- `sockets/socketManager.js` — Socket.IO event handlers (~1000 lines)
- `middleware/auth.middleware.js` — JWT verification
- `services/piston.service.js` — Code execution service

**Architecture Pattern:** MVC (Model-View-Controller)
- **Models:** Mongoose schemas in `models/`
- **Views:** JSON responses
- **Controllers:** Request handlers in `controllers/`

**In-Memory State:**
- `rooms` Map — Per-room collaboration state:
  - `users` — Connected socket IDs + metadata
  - `codeBuffers` — File content buffers (fileId → {content, language})
  - `debounceTimers` — 2-second auto-save timers
  - `permissions` — Per-user edit permissions (Leader Mode)
  - `leaderSocketId` — Current room leader
  - `interviewState` — Interview mode status

**No persistent sessions:** All collaboration state is in-memory. On server restart, rooms are cleared.

---

### Layer 3: Intelligence Layer (Python AI Service)

**Location:** `ai_service/app/`

**Responsibilities:**
- Index project files into vector database (RAG pipeline)
- Perform hybrid retrieval (vector + lexical + structural + filename)
- Generate embeddings via sentence-transformers
- Query LLM (OpenRouter or Ollama)
- Validate LLM responses against retrieved evidence
- Static code analysis (regex-based defect detection)
- Intent classification (BUG/DEBUG/SECURITY/OPTIMIZATION)
- Dependency graph construction

**Key Files:**
- `main.py` — FastAPI app, all endpoints (~900 lines)
- `rag/vectorstore.py` — ChromaDB integration, indexing
- `rag/hybrid_retriever.py` — 4-channel score fusion
- `rag/chunker.py` — Code-aware chunking (AST + regex)
- `rag/embeddings.py` — Sentence-transformers wrapper
- `rag/lexical_search.py` — Pure Python BM25 implementation
- `rag/dependency_graph.py` — Static import analysis
- `llm/prompt_builder.py` — Structured prompt templates
- `intelligence/evidence_validator.py` — Citation validation + repair
- `intelligence/code_analyzer.py` — Defect pattern matching
- `intelligence/intent_analyzer.py` — Query classification

**No persistent connections:** Stateless HTTP service. All requests are independent.

---

## Component Breakdown

### Frontend Components

#### 1. Monaco Editor Integration

**Component:** `MonacoEditorWrapper.jsx`

**What it does:**
- Embeds VS Code's Monaco Editor in the browser
- Syntax highlighting for 7 languages (JavaScript, Python, C++, Java, TypeScript, Rust, Go)
- Auto-completion, bracket matching, error squiggles
- Dark theme (`vs-dark`)
- Connects to `WorkspaceContext` for code changes

**How it works:**
```javascript
import * as monaco from 'monaco-editor';

// Create editor instance
const editor = monaco.editor.create(editorRef.current, {
  value: code,
  language: language,
  theme: 'vs-dark',
  automaticLayout: true
});

// Listen to content changes
editor.onDidChangeModelContent(() => {
  const newCode = editor.getValue();
  handleCodeChange(newCode); // → Socket.IO emit
});
```

**Integration:**
- Reads: `activeFile.content` from WorkspaceContext
- Writes: Calls `updateCode()` → emits `codeChange` via Socket.IO
- Jump to line: `editor.revealLineInCenter(lineNumber)` for AI citations

---

#### 2. Socket.IO Client

**Component:** `SocketContext.jsx`

**What it does:**
- Maintains persistent WebSocket connection to backend
- Emits user actions (code changes, typing, cursor position)
- Listens to server broadcasts (code updates, user joined/left, execution results)
- Handles room join/leave lifecycle

**Events emitted by client:**
```javascript
socket.emit('join', { roomId, userName, userId, avatar, projectId });
socket.emit('codeChange', { roomId, code, fileId, language });
socket.emit('typing', { roomId, userName });
socket.emit('cursorPosition', { roomId, fileId, position });
socket.emit('compileCode', { code, roomId, language, stdin });
socket.emit('setLeaderMode', { roomId, enabled: true });
socket.emit('startInterview', { roomId, candidateSocketId, candidateName });
```

**Events listened by client:**
```javascript
socket.on('codeUpdate', ({ code, fileId, updatedBy }) => {
  // Update editor if not the sender
});
socket.on('userJoined', (userList) => {
  // Update collaborators list
});
socket.on('executionResult', ({ stdout, stderr, exitCode }) => {
  // Display in terminal panel
});
socket.on('leaderModeChanged', ({ enabled, leaderName }) => {
  // Show/hide leader controls
});
socket.on('permissionDenied', ({ message }) => {
  // Show error toast
});
```

**Connection management:**
- Auto-reconnect on disconnect
- Join room on component mount
- Leave room on unmount
- Clean up event listeners

---

#### 3. WebRTC Communication

**Hook:** `useWebRTC.js`

**What it does:**
- Establishes peer-to-peer audio/video streams
- Uses Socket.IO as signaling channel (no WebRTC server)
- Supports N:N mesh topology (each peer connects to every other peer)

**Flow:**
1. User clicks "Join Call" → emit `webrtc-join`
2. Server broadcasts `webrtc-user-joined` to all peers
3. Each peer creates `RTCPeerConnection` for the new user
4. Peer A creates offer → emit `webrtc-signal` with offer SDP
5. Peer B receives offer → creates answer → emit `webrtc-signal` with answer
6. ICE candidates exchanged via `webrtc-signal`
7. Streams connected, `ontrack` event fires → display remote video

**ICE Servers (STUN):**
```javascript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

**No TURN server:** Symmetric NAT traversal may fail. P2P works on most networks.

---

### Backend Components

#### 1. REST API Controllers

**Pattern:** Express route → middleware → controller → model → response

**Example: Project Controller**

```javascript
// routes/project.routes.js
router.get('/projects', protect, getProjects);
router.post('/projects', protect, createProject);

// controllers/project.controller.js
export const createProject = async (req, res, next) => {
  try {
    const { name, description, defaultLanguage } = req.body;
    
    // Generate unique room ID
    const activeRoomId = `room_${crypto.randomBytes(4).toString('hex')}`;
    
    // Create project in MongoDB
    const project = await Project.create({
      name,
      owner: req.user._id,
      activeRoomId,
      defaultLanguage,
      members: [{ user: req.user._id, role: 'owner' }]
    });
    
    // Create default entry file
    const entryFile = await ProjectFile.create({
      projectId: project._id,
      name: 'index.js',
      content: '// Start coding here\n',
      isEntry: true
    });
    
    // Create version snapshot
    await CodeVersion.create({
      projectId: project._id,
      fileId: entryFile._id,
      versionNumber: 1,
      content: entryFile.content,
      author: req.user._id
    });
    
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};
```

**Middleware chain:**
```javascript
Request
  → CORS (allow all origins)
  → Body parser (JSON, 10MB limit)
  → protect() middleware (JWT verify)
  → Controller function
  → Error handler middleware
  → Response
```

---

#### 2. Socket.IO Server

**File:** `sockets/socketManager.js`

**Architecture:** Single `setupSockets(io)` function with all event handlers

**Room state structure:**
```javascript
const rooms = new Map(); // roomId → room state

// Per-room state
{
  users: Map,              // socketId → {name, userId, avatar}
  codeBuffers: Map,        // fileId → {content, language}
  debounceTimers: Map,     // fileId → setTimeout timer
  projectId: string,       // MongoDB project ID
  sessionStartTime: number,
  leaderId: string,        // MongoDB user ID of leader
  leaderSocketId: string,  // Socket ID of leader
  leaderMode: boolean,     // Leader Mode enabled?
  permissions: Map,        // socketId → {role, canEdit}
  interviewState: {
    active: boolean,
    candidateSocketId: string,
    candidateName: string,
    startedAt: number
  },
  lastEditLogTimestamps: Map // Rate limiting for event logs
}
```

**Key event: `codeChange`**

```javascript
socket.on('codeChange', ({ roomId, code, fileId, language }) => {
  const room = rooms.get(roomId);
  
  // Security check: Leader Mode permission enforcement
  if (room.leaderMode) {
    const userPerm = room.permissions.get(socket.id);
    const canEdit = (socket.id === room.leaderSocketId) || userPerm?.canEdit;
    if (!canEdit) {
      socket.emit('permissionDenied', { 
        message: 'Leader Mode active. View-only access.' 
      });
      return;
    }
  }
  
  // Update in-memory buffer
  room.codeBuffers.set(fileId, { content: code, language });
  
  // Debounced database save (2 seconds)
  if (room.debounceTimers.has(fileId)) {
    clearTimeout(room.debounceTimers.get(fileId));
  }
  const timer = setTimeout(async () => {
    await ProjectFile.findByIdAndUpdate(fileId, { content: code });
    io.to(roomId).emit('fileSaved', { fileId });
  }, 2000);
  room.debounceTimers.set(fileId, timer);
  
  // Broadcast to other peers (not sender)
  socket.to(roomId).emit('codeUpdate', { code, fileId, updatedBy: currentUser });
  
  // Log event (throttled: max 1 per 8 seconds per user)
  logEvent(roomId, projectId, userId, userName, 'CODE_EDIT', { fileId });
});
```

**Leadership resolution:**

When a user joins a room, backend checks:
1. Is user the Project.owner? → Assign as leader
2. Is user a member with role "owner"? → Assign as leader
3. Is user a researcher/admin AND a project member? → Assign as leader
4. Else → Assign as regular editor

If leader leaves, reassign leadership using same logic on remaining users.

---

#### 3. Database Models

**Technology:** Mongoose (MongoDB ODM)

**Schema definitions:** `backend/models/`

**Key models:**

##### User
```javascript
{
  name: String,
  email: String (unique, lowercase),
  passwordHash: String (bcrypt, 10 rounds, select: false),
  avatar: String (URL),
  bio: String,
  role: 'developer' | 'researcher' | 'admin',
  timestamps: true
}
```

##### Project
```javascript
{
  name: String,
  description: String,
  owner: ObjectId → User,
  members: [{
    user: ObjectId → User,
    role: 'owner' | 'editor' | 'viewer',
    joinedAt: Date
  }],
  activeRoomId: String (unique, e.g. 'room_a3f7b2c9'),
  defaultLanguage: 'javascript' | 'python' | 'cpp' | 'java' | 'typescript',
  isPublic: Boolean,
  timestamps: true
}
```

##### ProjectFile
```javascript
{
  projectId: ObjectId → Project,
  name: String (e.g. 'main.py'),
  path: String (e.g. '/src/main.py'),
  language: String,
  content: String,
  isEntry: Boolean,
  lastModifiedBy: ObjectId → User,
  timestamps: true
}
// Unique index: {projectId, path}
```

##### CodeVersion
```javascript
{
  projectId: ObjectId → Project,
  fileId: ObjectId → ProjectFile,
  fileName: String,
  versionNumber: Number,
  content: String,
  author: ObjectId → User,
  authorName: String,
  changeSummary: String,
  triggerType: 'manual' | 'autosave' | 'pre_execution' | 'session_end',
  createdAt: Date
}
```

##### RoomSession
```javascript
{
  roomId: String,
  projectId: ObjectId → Project,
  startedAt: Date,
  endedAt: Date,
  leaderId: ObjectId → User,
  leaderName: String,
  collaborationMode: 'NORMAL' | 'LEADER' | 'CONTROLLED',
  aiMode: 'NONE' | 'GENERIC' | 'RAG',
  interview: {
    active: Boolean,
    candidateName: String,
    candidateSocketId: String,
    startedAt: Date,
    endedAt: Date
  },
  participants: [{
    user: ObjectId → User,
    name: String,
    joinedAt: Date,
    leftAt: Date
  }]
}
```

##### SessionEvent
```javascript
{
  sessionId: ObjectId → RoomSession,
  roomId: String,
  projectId: ObjectId → Project,
  userId: ObjectId → User,
  userName: String,
  eventType: String (31 enum values),
  timestamp: Date,
  metadata: Object
}
```

**Event types:**
- Collaboration: USER_JOINED, USER_LEFT, CODE_EDIT
- Execution: CODE_EXECUTED, CODE_EXECUTION_SUCCESS, CODE_EXECUTION_FAILURE
- Permissions: LEADER_MODE_ENABLED, EDIT_PERMISSION_GRANTED
- Interview: INTERVIEW_STARTED, TAB_HIDDEN, WINDOW_BLURRED
- AI: AI_REQUEST, AI_RESPONSE

---

### AI Service Components

#### 1. RAG Indexing Pipeline

**Endpoint:** `POST /api/rag/index`

**Input:**
```json
{
  "project_id": "507f1f77bcf86cd799439011",
  "files": [
    {
      "fileId": "507f...",
      "fileName": "main.py",
      "filePath": "/main.py",
      "language": "python",
      "content": "def greet():\n    print('Hello')\n"
    }
  ]
}
```

**Pipeline stages:**

```
1. Code Chunking (chunker.py)
   ↓
   Input: Full file content
   Output: Chunks with metadata (symbol, startLine, endLine)
   
   Python: AST parsing → functions, classes
   JS/TS:  Regex → functions, classes, arrow functions
   C/C++:  Regex → functions, classes
   Fallback: 30-line sliding window with 6-line overlap

2. Embedding Generation (embeddings.py)
   ↓
   Input: Chunk text
   Output: 384-dim vector
   
   Model: sentence-transformers/all-MiniLM-L6-v2
   Normalization: L2 norm (cosine similarity ready)
   Fallback: Deterministic hash-based vectors (no semantic meaning)

3. Lexical Index Build (lexical_search.py)
   ↓
   BM25 index construction
   Tokenization: camelCase/snake_case splitting
   Parameters: k1=1.5, b=0.75
   Boosted text: "{fileName} {filePath} {symbol} {symbol} {text}"

4. Dependency Graph Build (dependency_graph.py)
   ↓
   Static import analysis
   Python: AST import/from statements
   JS/TS:  import/require/dynamic import
   C/C++:  #include directives
   Java:   import statements
   
   Output: Bidirectional graph (forward/backward edges)

5. Vector Store Persist (vectorstore.py)
   ↓
   ChromaDB upsert
   Collection name: "proj_{project_id}"
   Metadata: fileId, fileName, startLine, endLine, fileContentHash
   Distance: Cosine similarity
```

**Output:**
```json
{
  "success": true,
  "files_indexed": 5,
  "chunks_created": 47,
  "storage_path": "./chroma_db/proj_507f1f77bcf86cd799439011"
}
```

---

#### 2. Hybrid Retrieval Engine

**Component:** `HybridRetriever` in `hybrid_retriever.py`

**Method:** `retrieve(query, project_id, top_k=5)`

**4 Parallel Channels:**

```python
# Channel 1: Vector Similarity (40% weight)
semantic_results = vector_store.query(
    project_id=project_id,
    query_text=query,
    n_results=30
)
# Returns: [(chunk, cosine_score), ...]

# Channel 2: Lexical BM25 (25% weight)
lexical_results = lexical_store.search(
    project_id=project_id,
    query=query,
    top_k=30
)
# Returns: [(chunk, bm25_score), ...]

# Channel 3: Dependency Graph (20% weight)
seed_files = extract_filenames_from_query(query)
structural_results = dependency_graph.expand_candidates(
    seed_files=seed_files,
    max_depth=1
)
# Returns: {file_key: relevance_score, ...}

# Channel 4: Filename Match (15% weight)
filename_scores = {}
for chunk in all_chunks:
    if query_filename in chunk['fileName'].lower():
        filename_scores[chunk['id']] = 1.0  # Exact match
    elif query_filename_stem in chunk['fileName'].lower():
        filename_scores[chunk['id']] = 0.7  # Partial match
```

**Score Fusion:**

```python
final_scores = {}
for chunk_id in candidate_pool:
    semantic_score = semantic_results.get(chunk_id, 0.0)
    lexical_score = lexical_results.get(chunk_id, 0.0)
    structural_score = structural_results.get(chunk['fileName'], 0.0)
    filename_score = filename_scores.get(chunk_id, 0.0)
    
    final_scores[chunk_id] = (
        0.40 * semantic_score +
        0.25 * lexical_score +
        0.20 * structural_score +
        0.15 * filename_score
    )

# Sort by final score, return top_k
top_chunks = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
```

**Why these weights?**
- **Semantic (0.40):** Highest because it captures meaning, synonyms, concepts
- **Lexical (0.25):** Important for exact keyword matches (variable names, function names)
- **Structural (0.20):** Brings in related files via imports (often more relevant than isolated chunks)
- **Filename (0.15):** Boosts explicitly mentioned files

**Output:**
```python
{
    "chunks": [
        {
            "fileId": "...",
            "fileName": "auth.py",
            "filePath": "/backend/auth.py",
            "startLine": 42,
            "endLine": 58,
            "symbol": "validate_token",
            "text": "def validate_token(token):\n    ...",
            "score": 0.847,
            "scores_breakdown": {
                "semantic": 0.92,
                "lexical": 0.78,
                "structural": 0.85,
                "filename": 1.0
            }
        },
        ...
    ],
    "count": 5,
    "retrievalMetadata": {
        "hybrid_weights": [0.40, 0.25, 0.20, 0.15],
        "candidate_pool_size": 30
    }
}
```

---

#### 3. LLM Integration

**Provider Selection (runtime decision):**

```python
async def query_ollama(prompt: str, model_override: str = None):
    """Route to OpenRouter if API key set, else Ollama"""
    
    if settings.openrouter_api_key:
        return await _query_openrouter(prompt, model_override)
    else:
        return await _query_ollama_local(prompt, model_override)
```

**OpenRouter (Production):**
```python
async def _query_openrouter(prompt: str, model_override: str = None):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "https://devshare.app",
        "X-Title": "DevShare RAG Assistant"
    }
    payload = {
        "model": model_override or "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        data = response.json()
        return data["choices"][0]["message"]["content"]
```

**Ollama (Fallback):**
```python
async def _query_ollama_local(prompt: str, model_override: str = None):
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {
        "model": model_override or "qwen2.5-coder:1.5b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3}
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        data = response.json()
        return data["response"]
```

**Model characteristics:**

| Model | Provider | Size | Speed | Quality | Use Case |
|-------|----------|------|-------|---------|----------|
| gpt-4o-mini | OpenRouter | Unknown | Fast (1-2s) | High | Production |
| qwen2.5-coder:1.5b | Ollama | 1.5B params | Very fast (<1s) | Moderate | Local dev |

---

#### 4. Evidence Validation

**Component:** `EvidenceValidator` in `intelligence/evidence_validator.py`

**Purpose:** Ensure LLM responses are grounded in retrieved evidence

**Validation pipeline:**

```python
class EvidenceValidator:
    def validate_llm_response(
        self,
        llm_output: str,
        canonical_evidence: List[Dict],
        query: str
    ) -> Dict:
        
        # Step 1: Parse JSON from LLM (handles markdown fences)
        try:
            parsed = self._extract_json(llm_output)
        except:
            return {
                "status": "MODEL_OUTPUT_INVALID",
                "reason": "Could not parse JSON response"
            }
        
        # Step 2: Check required structure
        if "intent" not in parsed or "claims" not in parsed:
            return {"status": "MODEL_OUTPUT_INVALID"}
        
        # Step 3: Validate each claim's citations
        valid_claims = []
        rejected_claims = []
        
        for claim in parsed["claims"]:
            evidence_list = claim.get("evidence", [])
            
            # Check citation validity
            for ev in evidence_list:
                file_id = ev.get("fileId")
                line_range = ev.get("lineRange", {})
                
                # Match against canonical evidence
                found = self._find_matching_evidence(
                    file_id, line_range, canonical_evidence
                )
                
                if not found:
                    rejected_claims.append({
                        "claim": claim["text"],
                        "reason": f"Invalid citation: {file_id}"
                    })
                    break
            else:
                valid_claims.append(claim)
        
        # Step 4: Check for hallucinated entities
        hallucinations = self._detect_hallucinations(
            parsed, canonical_evidence
        )
        
        if hallucinations:
            rejected_claims.extend(hallucinations)
        
        # Step 5: Classify result
        if len(rejected_claims) == 0:
            status = "ANSWER"
        elif len(valid_claims) == 0:
            status = "INSUFFICIENT_EVIDENCE"
        else:
            status = "PARTIAL_ANSWER"
        
        return {
            "status": status,
            "valid_claims": valid_claims,
            "rejected_claims": rejected_claims,
            "unsupported_claim_count": len(rejected_claims)
        }
```

**Repair loop (if validation fails):**

```python
if validator_result["status"] == "MODEL_OUTPUT_INVALID":
    # Second attempt with simplified repair prompt
    repair_prompt = f"""
The previous response was malformed. Please provide a valid JSON response.

Query: {query}
Evidence files: {[e['fileName'] for e in evidence]}

Required format:
{{"intent": "...", "claims": [{{"text": "...", "evidence": [...]}}]}}
"""
    
    repaired_response = await query_llama(repair_prompt)
    validator_result = validator.validate_llm_response(
        repaired_response, evidence, query
    )
```

**No infinite loops:** Maximum 1 repair attempt.

---

#### 5. Prompt Engineering

**Component:** `PromptBuilder` in `llm/prompt_builder.py`

**Key prompts:**

##### Developer Prompt (RAG mode)
```python
def build_developer_prompt(
    user_message: str,
    active_file_name: str,
    active_code: str,
    language: str,
    rag_snippets: List[Dict],
    ml_analysis: Dict,
    last_error: str
) -> str:
    return f"""You are **DevShare AI** — a senior software engineer and coding assistant.

## Response guidelines
- Use headings, bullet points, code blocks
- Explain step by step
- Cite file names and line numbers
- Show complete, runnable code
- Never invent file names or functions not in evidence

## Project source evidence
[Source 1] auth.py (lines 42-58)
```python
def validate_token(token):
    ...
```
[Source 2] db.py (lines 10-25)
...

## Current editor context
**Active file** (`{active_file_name}`):
```{language}
{active_code}
```

{f"**Runtime error:**\n```\n{last_error}\n```" if last_error else ""}

## Developer question
{user_message}

Answer below (use Markdown):
"""
```

**Prompt characteristics:**
- **Structured:** Clear sections with headers
- **Grounded:** Evidence presented first
- **Explicit instructions:** "Never invent file names"
- **Format requirements:** "Use Markdown", "Show complete code"
- **Context-rich:** Active file + error + evidence + question

##### Debug Prompt
```python
def build_debug_prompt(...) -> str:
    return f"""You are **DevShare AI** — a senior debugger.

Analyze the error and provide:
1. **Root cause** — Why the error occurs
2. **Affected location** — File and line number
3. **Step-by-step fix** — What to change
4. **Fixed code** — Complete corrected block
5. **Prevention tip** — How to avoid this bug

## Runtime error
```
{last_error}
```

## Active file (`{file_name}`)
```{language}
{code}
```

Debug report (Markdown):
"""
```

**5-section structure** ensures comprehensive debugging responses.

---

## Data Flow Patterns

### Pattern 1: Real-time Code Synchronization

```
┌─────────┐                 ┌─────────┐                 ┌─────────┐
│ User A  │                 │ Backend │                 │ User B  │
│ Browser │                 │ Socket  │                 │ Browser │
└────┬────┘                 └────┬────┘                 └────┬────┘
     │                           │                           │
     │ Types 'x'                 │                           │
     ├─────codeChange────────────>                           │
     │ {code, fileId, roomId}    │                           │
     │                           │                           │
     │                           ├─ Update room.codeBuffers  │
     │                           ├─ Set 2s debounce timer    │
     │                           │                           │
     │                           ├───────codeUpdate──────────>
     │                           │   {code, fileId, user:'A'} │
     │                           │                           │
     │                           │                      Updates editor
     │                           │                      (if not typing)
     │                           │                           │
     ├────────────────  2 seconds elapse  ─────────────────  │
     │                           │                           │
     │                           ├─ MongoDB.save(code)       │
     │                           │                           │
     │<──────fileSaved───────────┤                           │
     │<────────────────────────────────────fileSaved─────────┤
     │                           │                           │
```

**Key points:**
- Optimistic updates (instant local change)
- Broadcast excludes sender
- Database write is debounced (not on every keystroke)
- No conflict resolution (last write wins)

---

### Pattern 2: Code Execution Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │     │ Backend │     │ Piston  │     │ MongoDB │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ Run button    │               │               │
     ├─compileCode───>               │               │
     │ {code, lang}  │               │               │
     │               │               │               │
     │               ├─ Auto-snapshot ───────────────>
     │               │   (CodeVersion.create)         │
     │               │                               │
     │               ├───POST /execute────>          │
     │               │   {code, language}  │         │
     │               │                     │         │
     │               │               Runs sandbox    │
     │               │               (10s timeout)   │
     │               │                     │         │
     │               │<───{stdout,stderr}──┤         │
     │               │                     │         │
     │               ├─ Create ExecutionLog ─────────>
     │               │                               │
     │<─executionResult                              │
     │  {output}     │                               │
     │               │                               │
     │ Display       │                               │
     │ in terminal   │                               │
     │               │                               │
```

**Fallback behavior:**
If Piston returns "whitelist only" error or times out:
→ Local execution via Node.js `child_process.exec()`
→ Only supports JavaScript and Python
→ 10-second timeout, temp file cleanup

---

### Pattern 3: RAG Query Flow (Detailed)

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Browser │  │ Backend │  │  FastAPI│  │ChromaDB │  │OpenRouter│
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │            │
     │ User types │            │            │            │
     │ "What does│            │            │            │
     │  auth do?"│            │            │            │
     ├─POST /ai/chat          │            │            │
     ├───────────>            │            │            │
     │            │            │            │            │
     │            ├─POST /api/chat          │            │
     │            ├───────────>│            │            │
     │            │            │            │            │
     │            │            ├─1. Intent analysis      │
     │            │            │   (BUG/DEBUG/EXPLAIN)   │
     │            │            │                         │
     │            │            ├─2. Stale check          │
     │            │            │   (SHA-256 hash)        │
     │            │            │                         │
     │            │            ├─3. Hybrid retrieval     │
     │            │            │                         │
     │            │            ├───Vector query──────────>
     │            │            │   (cosine similarity)   │
     │            │            │<───30 chunks────────────┤
     │            │            │                         │
     │            │            ├─4. BM25 search          │
     │            │            │   (lexical_store)       │
     │            │            │                         │
     │            │            ├─5. Dependency graph     │
     │            │            │   (structural edges)    │
     │            │            │                         │
     │            │            ├─6. Score fusion         │
     │            │            │   (0.40+0.25+0.20+0.15) │
     │            │            │                         │
     │            │            ├─7. Build prompt         │
     │            │            │   (evidence + question) │
     │            │            │                         │
     │            │            ├───POST /chat───────────>
     │            │            │   {model: gpt-4o-mini}  │
     │            │            │                         │
     │            │            │               Generates │
     │            │            │               response  │
     │            │            │                         │
     │            │            │<───JSON response────────┤
     │            │            │                         │
     │            │            ├─8. Validate evidence    │
     │            │            │   (citation check)      │
     │            │            │                         │
     │            │            ├─9. Repair (if invalid)  │
     │            │            ├───POST /chat (2nd)─────>
     │            │            │<───Fixed response───────┤
     │            │            │                         │
     │            │            ├─10. Render markdown     │
     │            │            │                         │
     │            │<───200 OK──┤                         │
     │            │   {response,│                        │
     │            │    sources,│                         │
     │            │    model,  │                         │
     │            │    latency}│                         │
     │<───200 OK──┤            │                         │
     │            │            │                         │
     │ Display in │            │                         │
     │ AI drawer  │            │                         │
     │            │            │                         │
```

**Total latency:** 2-4 seconds
- Retrieval: 200-500ms
- LLM call: 1-3s (depends on response length)
- Validation + rendering: 100-200ms

---

### Pattern 4: Incremental RAG Index Update

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │     │ Backend │     │ AI Service│
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     │ Create file   │               │
     ├─POST /files───>               │
     │               │               │
     │               ├─ MongoDB.save │
     │               │               │
     │               ├─ Fire-and-forget HTTP
     │               ├───POST /rag/file/update
     │               │   (async, no await)  │
     │<──201 Created─┤               │
     │               │               │
     │               │               ├─ Delete old chunks
     │               │               │  (if file existed)
     │               │               │
     │               │               ├─ Chunk new content
     │               │               │  (AST parsing)
     │               │               │
     │               │               ├─ Generate embeddings
     │               │               │  (sentence-transformers)
     │               │               │
     │               │               ├─ Upsert ChromaDB
     │               │               │
     │               │               ├─ Rebuild BM25 index
     │               │               │
     │               │               ├─ Update dependency graph
     │               │               │
     │               (Backend doesn't wait)
     │               (No response expected)
     │               │               │
```

**Why fire-and-forget?**
- Backend doesn't block on indexing (faster file creation)
- RAG index updates in background (eventual consistency)
- User can continue editing immediately
- If indexing fails, next full reindex will fix it

**Authentication:** `X-Internal-Service-Key` header (not JWT)

---

## Communication Protocols

### HTTP/REST (Synchronous)

**Port:** 5000 (backend), 8000 (AI service)

**Authentication:**
- Backend: `Authorization: Bearer <JWT>`
- AI service: `X-Internal-Service-Key: <secret>` (for internal calls)

**Response format:**
```json
{
  "success": true,
  "data": {...},
  "count": 10,      // For list endpoints
  "message": "..."  // For mutations
}
```

**Error format:**
```json
{
  "error": "Descriptive error message",
  "statusCode": 400
}
```

**CORS:** `Access-Control-Allow-Origin: *` (open during development)

---

### WebSocket (Real-time)

**Technology:** Socket.IO (WebSocket + HTTP long-polling fallback)

**Connection:** `ws://localhost:5000` or `wss://` in production

**Authentication:**
```javascript
socket.auth = { token: jwtToken };
socket.connect();
```

**Room-based:** Each project has a unique `activeRoomId`

**Event namespace:** Global (no namespaces)

**Reconnection:** Auto-reconnect enabled (max 10 attempts, exponential backoff)

---

### WebRTC (Peer-to-Peer)

**Signaling:** Socket.IO (not a separate WebRTC server)

**Topology:** Full mesh (N×(N-1)/2 connections for N peers)

**Codec:** Opus for audio, VP8/H.264 for video (browser-dependent)

**Bandwidth:** Adaptive (browser handles degradation)

**NAT Traversal:** STUN only (no TURN)

---

## Security Architecture

### Authentication

**Method:** JWT (JSON Web Tokens)

**Flow:**
1. User submits credentials → `POST /api/auth/login`
2. Backend verifies password (bcrypt.compare)
3. Backend signs JWT: `jwt.sign({ id: user._id }, SECRET, { expiresIn: '7d' })`
4. Frontend stores token in `localStorage`
5. Frontend attaches token to every request: `Authorization: Bearer <token>`
6. Backend verifies: `jwt.verify(token, SECRET)` → extracts user ID → loads user from DB

**Token lifetime:** 7 days (no refresh token)

**Logout:** Client deletes token from localStorage (server doesn't track sessions)

---

### Authorization

**Project access:**
- Owner: Full control (delete project, manage members)
- Editor: Read/write files, execute code
- Viewer: Read-only (rarely used)

**Public projects:** Any authenticated user can join as editor

**Leader Mode:**
- Only leader can toggle leader mode
- Only leader can grant/revoke edit permissions
- Non-leaders with `canEdit: false` get `permissionDenied` event on edit attempts

---

### Input Validation

**Backend:**
- Mongoose schema validation (required fields, maxlength, enums)
- Custom validators in controllers
- No SQL injection risk (MongoDB uses BSON, not SQL)

**AI Service:**
- Pydantic models for all endpoints (type checking, range validation)
- Regex sanitization for file paths
- SHA-256 hash verification (file integrity)

**Frontend:**
- HTML escaping via React (automatic)
- No `dangerouslySetInnerHTML` usage
- Markdown rendering via `react-markdown` (XSS-safe)

---

### Network Security

**HTTPS:** Required in production (TLS 1.2+)

**CSP:** Not currently implemented (TODO)

**Rate Limiting:** Not implemented (TODO)

**DDoS Protection:** Rely on cloud provider (Railway/Vercel)

---

### Data Privacy

**Password storage:** bcrypt (10 rounds, salted)

**JWT secret:** Environment variable (not in Git)

**API keys:** Environment variables (OpenRouter, MongoDB Atlas)

**Interview monitoring:**
- Consent modal shown before tracking
- Events logged: tab visibility, window focus, fullscreen status
- No screen recording, no keystroke logging, no webcam capture

**Research data export:**
- Restricted to `role: researcher` or `role: admin`
- Participant IDs anonymized in CSV exports
- No PII in event metadata

---

## Persistence Layer

### MongoDB Collections

**Connection:** Mongoose 9.0.5 → MongoDB 6.0+

**URI format:**
- Local: `mongodb://localhost:27017/devshare`
- Atlas: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/devshare`

**Connection options:**
```javascript
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

**Indexes:**
```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });

// Projects
db.projects.createIndex({ owner: 1 });
db.projects.createIndex({ activeRoomId: 1 }, { unique: true });

// ProjectFiles
db.projectfiles.createIndex({ projectId: 1, path: 1 }, { unique: true });

// CodeVersions
db.codeversions.createIndex({ fileId: 1, versionNumber: -1 });

// SessionEvents
db.sessionevents.createIndex({ roomId: 1, timestamp: -1 });
db.sessionevents.createIndex({ eventType: 1 });
```

**Backup strategy:** MongoDB Atlas automated backups (daily snapshots)

---

### ChromaDB Collections

**Storage:** File-based (SQLite + parquet files)

**Path:** `./chroma_db/` (relative to AI service working directory)

**Per-project isolation:**
- Collection name: `proj_{project_id}`
- Each project gets its own collection
- No cross-project queries

**Schema:**
```python
collection.add(
    documents=[chunk["text"]],           # Full chunk text
    embeddings=[embedding_vector],       # 384-dim float array
    metadatas=[{
        "fileId": "...",
        "fileName": "main.py",
        "filePath": "/main.py",
        "language": "python",
        "symbol": "greet",
        "symbolType": "function",
        "startLine": 10,
        "endLine": 15,
        "chunkIndex": 0,
        "fileContentHash": "sha256...",
        "chunkHash": "sha256..."
    }],
    ids=[chunk["id"]]                    # Unique chunk ID
)
```

**Distance metric:** Cosine similarity (optimized for normalized embeddings)

**Query example:**
```python
results = collection.query(
    query_embeddings=[query_vector],
    n_results=30,
    where={"projectId": project_id}  # Optional metadata filter
)
```

---

## AI & RAG Pipeline

### Why RAG?

**Problem:** Generic LLMs hallucinate when asked about specific codebases

**Solution:** Retrieve relevant code chunks → inject into prompt → LLM grounds response in evidence

**Advantage over fine-tuning:**
- No training required (instant indexing)
- Always up-to-date (incremental updates)
- Explainable (shows sources)
- Works with any LLM (provider-agnostic)

---

### RAG Architecture Diagram

```
User Query: "How does auth work?"
     ↓
┌────────────────────────────────────────────┐
│  1. Intent Classifier                      │
│     (BUG/DEBUG/SECURITY/EXPLAIN)           │
└────────────┬───────────────────────────────┘
             ↓
┌────────────────────────────────────────────┐
│  2. Hybrid Retriever (4 channels)          │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Vector   │  │ BM25     │  │ Dep Graph│ │
│  │ (0.40)   │  │ (0.25)   │  │ (0.20)   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │            │            │         │
│       └────────┬───┴────────────┘         │
│                ↓                           │
│         ┌──────────────┐                   │
│         │ Score Fusion │                   │
│         └──────┬───────┘                   │
└────────────────┼───────────────────────────┘
                 ↓
         Top 5 code chunks
                 ↓
┌────────────────────────────────────────────┐
│  3. Prompt Builder                         │
│     - Evidence blocks                      │
│     - Active file context                  │
│     - Error messages                       │
│     - Developer question                   │
└────────────┬───────────────────────────────┘
             ↓
┌────────────────────────────────────────────┐
│  4. LLM (OpenRouter gpt-4o-mini)           │
│     Temperature: 0.3, Max tokens: 2000     │
└────────────┬───────────────────────────────┘
             ↓
         JSON response
             ↓
┌────────────────────────────────────────────┐
│  5. Evidence Validator                     │
│     - Check citations (fileId, lineRange)  │
│     - Detect hallucinations                │
│     - Repair loop (1 retry max)            │
└────────────┬───────────────────────────────┘
             ↓
┌────────────────────────────────────────────┐
│  6. Markdown Renderer                      │
│     - Format claims                        │
│     - Add source links                     │
│     - Code block highlighting              │
└────────────┬───────────────────────────────┘
             ↓
      Final response shown in AI drawer
```

---

### Chunking Strategy Rationale

**Why not embed entire files?**
- Large files exceed context window
- Embeddings are less precise
- Irrelevant code pollutes results

**Why AST parsing over naive splitting?**
- Functions/classes are semantic units
- Preserves method signatures
- Keeps docstrings with code

**Why 30-line sliding window for fallback?**
- Balances granularity vs context
- 6-line overlap prevents splitting statements
- Fits most functions (median ~15 lines)

**Why track line numbers?**
- Enables jump-to-source in IDE
- User can verify citations
- Improves trust in AI responses

---

### Embedding Model Selection

**Chosen:** `sentence-transformers/all-MiniLM-L6-v2`

**Alternatives considered:**

| Model | Dimensions | Speed | Quality | Chosen? |
|-------|-----------|-------|---------|---------|
| all-MiniLM-L6-v2 | 384 | Fast | Good | ✅ Yes |
| all-mpnet-base-v2 | 768 | Medium | Better | ❌ Too slow |
| CodeBERT | 768 | Slow | Code-specific | ❌ Overkill |
| OpenAI text-embedding-3-small | 1536 | API call | Best | ❌ Cost |

**Why all-MiniLM-L6-v2?**
- Small model (80MB)
- Runs on CPU (no GPU needed)
- Fast inference (10ms per chunk)
- Good enough for code similarity
- Open source (no API costs)

---

## Real-time Collaboration

### Conflict Resolution Strategy

**Current approach:** Last-write-wins (LWW)

**How it works:**
1. User A types 'x' → emits `codeChange`
2. User B types 'y' simultaneously → emits `codeChange`
3. Server receives A's change first → broadcasts to B
4. Server receives B's change second → broadcasts to A
5. Both clients now have B's version (last write wins)

**Limitations:**
- Concurrent edits overwrite each other
- No merge resolution
- No undo across users

**Why not use CRDT/OT?**
- Complexity: Requires conflict-free replicated data types or operational transformation
- Overhead: Every keystroke must be a transformable operation
- Overkill: DevShare targets pair programming, not Google Docs-level concurrency
- Tradeoff: Simplicity > perfect concurrency handling

**Mitigation:**
- Leader Mode: Only one person edits at a time
- Visual indicators: Show who's typing
- Fast sync: Sub-100ms latency reduces conflict window

---

### Presence Indicators

**Typing indicator:**
```javascript
// Emitted on keydown (debounced 500ms)
socket.emit('typing', { roomId, userName });

// Received by others
socket.on('userTyping', (userName) => {
  showTypingBadge(`${userName} is typing...`);
});
```

**Cursor position:**
```javascript
// Emitted on cursor move (throttled 200ms)
const position = editor.getPosition();
socket.emit('cursorPosition', { 
  roomId, 
  fileId, 
  position: { line: position.lineNumber, column: position.column }
});

// Received by others
socket.on('userCursor', ({ userName, avatar, fileId, position }) => {
  if (fileId === activeFile.id) {
    showCursorWidget(userName, avatar, position);
  }
});
```

**Active file:**
```javascript
// Emitted on file switch
socket.emit('activeFileChange', { roomId, fileId, fileName });

// Display in collaborators panel
socket.on('userActiveFile', ({ userName, fileId, fileName }) => {
  updateCollaboratorStatus(userName, `Editing ${fileName}`);
});
```

---

## Research & Analytics

### Event Logging System

**Purpose:** Capture developer behavior for HCI/CSCW research

**Logged events (31 types):**

| Category | Events |
|----------|--------|
| Collaboration | USER_JOINED, USER_LEFT, CODE_EDIT |
| Execution | CODE_EXECUTED, CODE_EXECUTION_SUCCESS, CODE_EXECUTION_FAILURE |
| AI | AI_REQUEST, AI_RESPONSE |
| Permissions | LEADER_MODE_ENABLED, EDIT_PERMISSION_GRANTED, EDIT_PERMISSION_REVOKED |
| Interview | INTERVIEW_STARTED, INTERVIEW_ENDED, TAB_HIDDEN, WINDOW_BLURRED, FULLSCREEN_EXITED |
| Media | AUDIO_ENABLED, VIDEO_ENABLED |

**Storage:** MongoDB `SessionEvent` collection

**Metadata examples:**
```javascript
// CODE_EDIT event
{
  eventType: "CODE_EDIT",
  userId: "507f...",
  userName: "Alice",
  timestamp: "2026-01-19T10:30:45.123Z",
  metadata: {
    fileId: "507f...",
    language: "python"
  }
}

// TAB_HIDDEN event (interview monitoring)
{
  eventType: "TAB_HIDDEN",
  userId: "507f...",
  userName: "Bob",
  timestamp: "2026-01-19T10:35:12.456Z",
  metadata: {
    visibilityState: "hidden",
    durationSeconds: 15
  }
}

// AI_RESPONSE event
{
  eventType: "AI_RESPONSE",
  metadata: {
    query: "How does auth work?",
    model: "gpt-4o-mini",
    condition: "RAG",
    latencyMs: 2340,
    retrievedFiles: ["auth.py", "db.py"],
    validator_result: "ANSWER",
    unsupported_claim_count: 0
  }
}
```

---

### NASA-TLX Questionnaire

**Purpose:** Measure cognitive workload

**6 dimensions (0-100 scale):**
1. Mental Demand — How mentally demanding was the task?
2. Physical Demand — How physically demanding was the task?
3. Temporal Demand — How hurried or rushed was the pace?
4. Performance — How successful were you?
5. Effort — How hard did you have to work?
6. Frustration — How insecure, discouraged, irritated were you?

**Storage:** `QuestionnaireResponse` model with `rawNasaTlx` field

**Export:** CSV with columns `NASA_TLX_responses: M:45,P:10,T:60,Perf:80,Eff:50,Frust:30`

---

### Analytics Export

**Endpoint:** `GET /api/analytics/export?format=csv&dataset=ai`

**Access control:** `role: researcher` or `role: admin` only

**Two datasets:**

**Dataset: `all` (comprehensive research data)**
```csv
participant_id,session_id,experiment_id,condition,ai_condition,
completion_time,tests_passed,code_changes,ai_requests,focus_events,
questionnaire_responses,NASA_TLX_responses
```

**Dataset: `ai` (AI-specific telemetry)**
```csv
query_id,session_id,project_id,participant_id,timestamp,model,
condition,query,response,retrieved_context_ids,retrieval_scores,
response_time,validator_result,unsupported_claim_count
```

**Privacy:** Participant IDs are MongoDB ObjectIds (anonymized, no email/name in export)

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────┐
│  Windows 11 Local Machine                       │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ MongoDB      │  │ Frontend     │            │
│  │ mongod.exe   │  │ npm run dev  │            │
│  │ Port 27017   │  │ Vite :5173   │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Backend      │  │ AI Service   │            │
│  │ node index.js│  │ uvicorn      │            │
│  │ Port 5000    │  │ Port 8000    │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

**Start commands:**
```bash
# Terminal 1: MongoDB
mongod.exe --dbpath C:\data\db

# Terminal 2: Backend
cd backend
npm start

# Terminal 3: AI Service
cd ai_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 4: Frontend
cd frontend
npm run dev
```

**Access:** `http://localhost:5173`

---

### Production Environment (Docker)

**Orchestration:** Docker Compose

**Services:**

```yaml
services:
  mongodb:
    image: mongo:6.0
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
    
  backend:
    build: ./backend
    ports: ["5000:5000"]
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/devshare
      - AI_SERVICE_URL=http://rag-service:8000
    depends_on: [mongodb]
    
  rag-service:
    build: ./ai_service
    ports: ["8000:8000"]
    volumes: ["chroma-data:/app/chroma_db"]
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      
  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [backend]
```

**Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Cloud Deployment (Railway)

**Configuration:** `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node backend/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Services:**
1. **Backend** — Node.js app
2. **AI Service** — Python FastAPI app
3. **MongoDB** — Railway-managed MongoDB add-on

**Environment variables:**
```
MONGODB_URI=mongodb+srv://...
AI_SERVICE_URL=https://devshare-ai.railway.app
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET=...
```

---

## Design Decisions & Rationale

### Why React over Vue/Svelte?

**Chosen:** React 19

**Reasons:**
- Largest ecosystem (libraries, components, tutorials)
- Monaco Editor has official React wrapper
- Socket.IO integrates easily via hooks
- Team familiarity

**Tradeoff:** Bundle size larger than Svelte (but Vite tree-shaking mitigates this)

---

### Why MongoDB over PostgreSQL?

**Chosen:** MongoDB

**Reasons:**
- Flexible schema (no migrations for rapid prototyping)
- JSON-native (API responses match DB documents)
- Mongoose ODM simplifies validation
- Horizontal scaling (sharding) for future growth

**Tradeoff:** No ACID transactions across collections (but DevShare doesn't need them)

---

### Why Socket.IO over Native WebSocket?

**Chosen:** Socket.IO

**Reasons:**
- Auto-reconnect built-in
- HTTP long-polling fallback (works behind restrictive firewalls)
- Room management (`socket.join(roomId)`)
- Event-based API (cleaner than raw WebSocket messages)

**Tradeoff:** Larger client bundle (~50KB vs 0KB for native)

---

### Why FastAPI over Flask/Django?

**Chosen:** FastAPI

**Reasons:**
- Async/await native (non-blocking I/O for LLM calls)
- Pydantic validation (type safety, auto API docs)
- Fast (Starlette under the hood)
- Modern Python 3.11+ features

**Tradeoff:** Smaller ecosystem than Flask (but sufficient for DevShare)

---

### Why ChromaDB over Pinecone/Weaviate?

**Chosen:** ChromaDB

**Reasons:**
- Open source (no vendor lock-in)
- Embedded mode (no separate server)
- File-based persistence (simple backups)
- Python-native (integrates with FastAPI)

**Tradeoff:** Not horizontally scalable (but DevShare projects are small)

---

### Why OpenRouter over Direct OpenAI?

**Chosen:** OpenRouter API

**Reasons:**
- Access to multiple models (gpt-4o-mini, Claude, Gemini) with one API key
- Usage-based pricing (no monthly subscription)
- Load balancing across providers

**Tradeoff:** Extra network hop (OpenRouter → OpenAI)

---

### Why No CRDT/OT?

**Decision:** Last-write-wins synchronization

**Reasons:**
- DevShare targets pair programming (2-3 users), not Google Docs (100+ users)
- CRDT complexity not justified for low concurrency
- Leader Mode mitigates conflicts (only one editor at a time)

**Tradeoff:** Concurrent edits overwrite (but rare in practice)

---

### Why Piston API over Local Sandboxing?

**Chosen:** External Piston API (with local fallback)

**Reasons:**
- No Docker runtime needed on backend
- Supports 50+ languages (DevShare only uses 7)
- Maintained by community

**Tradeoff:** External dependency (but graceful fallback to Node.js `exec()`)

---

## Conclusion

DevShare is a **three-tier web application** built for:
1. **Real-time collaboration** — Socket.IO-powered code synchronization
2. **Remote execution** — Piston API sandbox for running user code
3. **AI-powered assistance** — RAG pipeline with hybrid retrieval and evidence validation

**Core technologies:**
- **Frontend:** React 19 + Monaco Editor + Socket.IO Client
- **Backend:** Node.js + Express + Socket.IO + Mongoose
- **AI Service:** Python + FastAPI + ChromaDB + sentence-transformers + OpenRouter

**Key innovations:**
- **4-channel hybrid retrieval** (vector + lexical + structural + filename)
- **Evidence validation** with repair loop (ensures LLM grounding)
- **Leader Mode** (controlled collaboration for interviews/research)
- **Incremental RAG indexing** (fire-and-forget background updates)

**Production-ready features:**
- JWT authentication
- Version control (code snapshots)
- Session analytics export
- Docker deployment
- WebRTC audio/video

**Research contributions:**
- Session event logging (31 event types)
- NASA-TLX questionnaire integration
- Interview telemetry (focus tracking)
- AI condition comparison (RAG vs Generic)

---

**Last Updated:** January 19, 2026  
**Maintainer:** DevShare Team  
**License:** MIT (or specify your license)
