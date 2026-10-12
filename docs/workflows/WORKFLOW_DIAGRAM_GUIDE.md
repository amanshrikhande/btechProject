# DevShare Overall Workflow Diagram Guide

## Purpose

This document explains the **DevShare Overall Workflow Diagram** (`devshare_overall_workflow.mmd`), a comprehensive flowchart showing the complete user journey through the AI-powered collaborative coding platform.

---

## Diagram Overview

The workflow is organized into **5 major sections**:

1. **Authentication Layer** - User registration and login
2. **Project Management** - Creating, opening, and joining projects
3. **Collaborative IDE Workspace** - Core editing environment with parallel features
4. **AI Assistance Pipeline** - Detailed RAG-based code intelligence
5. **Session Termination** - Cleanup and resource management

---

## Section 1: Authentication Layer 🔐

**Flow:**
```
User Opens DevShare
→ Choose Login or Register
→ Validate Credentials (MongoDB)
→ Authentication Successful (JWT Token)
→ Project Dashboard
```

**Key Components:**
- JWT-based authentication
- MongoDB User model for credential storage
- Secure password hashing with bcryptjs

---

## Section 2: Project Management 📁

**Flow:**
```
Project Dashboard
→ Choose: Create New / Open Existing / Join Session
→ Load Project Files from MongoDB
→ Enter Collaborative Workspace
```

**Key Operations:**
- **Create New:** Initialize new project with MongoDB Project model
- **Open Existing:** Load ProjectFile documents from database
- **Join Session:** Connect to existing collaboration room via Room ID

**Technology:**
- MongoDB Mongoose models (Project, ProjectFile)
- Express REST APIs

---

## Section 3: Collaborative IDE Workspace 💻

### Role Assignment

**Leader Role Assignment (Server-Enforced):**
1. Project owner (MongoDB Project.owner)
2. Project member with "owner" role
3. Authorized researcher/admin on specific project

**Roles:**
- **LEADER:** Full control, can manage permissions
- **EDITOR:** Can edit code (default for members)
- **VIEWER:** Read-only access

### Parallel Workspace Features

Once in the workspace, users can access these features **independently**:

#### 1. Real-Time Collaboration
```
Edit Code → Broadcast via Socket.IO
→ Update All Peers → Auto-Save (2 sec debounce) → MongoDB
```

**Technology:**
- Socket.IO v4.8.1 for real-time synchronization
- Monaco Editor (VS Code engine)
- 2-second debounced auto-save

#### 2. AI Code Assistance (Expanded Detail)
See **Section 4** below for full pipeline.

#### 3. Code Execution
```
Send to Piston API
→ If Available: Sandboxed Container Execution
→ If Unavailable: Local Node.js/Python Fallback
→ Display stdout/stderr in Terminal
→ Log to ExecutionLog (MongoDB)
```

**Technology:**
- Piston API (primary): `https://emkc.org/api/v2/piston/execute`
- Local fallback: subprocess execution with 10s timeout
- Supported: JavaScript, Python, C++, C, Java, TypeScript

#### 4. WebRTC Communication
```
Initialize Full-Mesh P2P
→ Exchange Signaling via Socket.IO
→ Establish RTCPeerConnections
→ Audio/Video Streams Active
```

**Technology:**
- Native WebRTC APIs
- Socket.IO signaling
- Google STUN servers for NAT traversal
- Full-mesh topology (each peer connects to all others)

#### 5. Leader Mode Controls
```
Check if User is Leader
→ If Yes: Enable/Disable Lock, Grant/Revoke Permissions
→ Broadcast Updates via Socket.IO
→ Log to SessionEvent (MongoDB)
```

**Permissions:**
- Enable Lock: All non-leaders become VIEWER
- Disable Lock: Restore previous permissions
- Grant Edit: Upgrade specific user to EDITOR
- Revoke Edit: Downgrade specific user to VIEWER

#### 6. Interview Mode Telemetry
```
Check if User is Leader
→ Select Candidate → Show Privacy Modal
→ If Consents: Track TAB_HIDDEN/TAB_VISIBLE Events
→ Alert Leader on Focus Loss
→ Log to SessionEvent (MongoDB)
```

**Events Tracked:**
- TAB_HIDDEN: Candidate switches browser tabs
- TAB_VISIBLE: Candidate returns to DevShare tab
- WINDOW_BLUR: Candidate loses window focus
- WINDOW_FOCUS: Candidate regains window focus

**Privacy:** Candidate must explicitly consent via privacy modal before tracking begins.

#### 7. Session Analytics
```
Fetch SessionEvent from MongoDB
→ Generate Charts (Edits/Executions/AI Queries)
→ Optional: Export CSV/JSON for Research
```

**Metrics Tracked:**
- Edit count per user
- Code execution frequency
- AI query count
- Interview focus events
- Session duration

---

## Section 4: AI Assistance Pipeline 🤖

**Complete RAG Flow with Evidence Validation:**

### Step 1: Authorization Check
```
User Asks Question
→ Check: Is User Project Member?
→ If No: 403 Forbidden
→ If Yes: Forward to AI Service (FastAPI)
```

### Step 2: Hybrid Retrieval Engine

**Four Parallel Retrieval Channels:**

1. **Exact Filename Pattern Match** (Weight: 0.15)
   - Regex extraction of file references in query
   - Basename and stem matching

2. **BM25 Lexical Keyword Search** (Weight: 0.25)
   - Okapi BM25 ranking algorithm
   - Traditional keyword-based retrieval

3. **ChromaDB Vector Semantic Search** (Weight: 0.40)
   - sentence-transformers/all-MiniLM-L6-v2 embeddings
   - Cosine similarity ranking
   - **NOW FUNCTIONAL** (verified after embedding fix)

4. **Dependency Graph Traversal** (Weight: 0.20)
   - File import/importedBy relationships
   - Symbol-based file resolution

### Step 3: Merge & Rank Results
```
Normalize scores [0, 1] per channel
→ Weighted Fusion: 0.4×vec + 0.25×lex + 0.2×dep + 0.15×file
→ Select Top-K Relevant Chunks
```

### Step 4: Evidence Construction
```
Build Canonical Evidence:
- fileId (MongoDB ObjectId)
- filePath (authoritative path)
- startLine, endLine (exact ranges)
- snippet (code excerpt)
- fileContentHash (SHA-256)
- chunkHash (SHA-256)
```

### Step 5: Evidence Validation
```
Check: Sufficient Evidence?
→ If No: Return INSUFFICIENT_EVIDENCE
→ If Yes: Construct Grounded Prompt
```

**Prompt Structure:**
```
System Instructions: Role, grounding rules
+ Evidence Context: Files with line numbers
+ User Query
```

### Step 6: LLM Generation
```
Generate Answer using Ollama/OpenRouter
→ Default: Local Ollama (qwen2.5-coder:1.5b)
→ Fallback: OpenRouter API (if API key set)
```

### Step 7: Answer Validation
```
Validate: Are Claims Grounded in Evidence?
→ If No: Flag Unsupported Claims
→ If Yes: Return Answer + Source Citations
```

### Step 8: Display
```
Display in Chat Panel with:
- Answer text
- Source references (fileId, filePath, line ranges)
- Clickable navigation to evidence locations
```

### Step 9: Logging
```
Log AI_QUERY Event to SessionEvent (MongoDB):
- User ID
- Query text
- Response status
- Timestamp
```

**Failure Modes:**
- **INSUFFICIENT_EVIDENCE:** Not enough project context for the query
- **UNSUPPORTED_CLAIMS:** LLM made claims not backed by provided evidence
- **403 Forbidden:** User not authorized to access project AI context

---

## Section 5: Session Termination

**Cleanup Flow:**
```
User Exits Session
→ Flush File Buffers to MongoDB
→ Update RoomSession with endedAt timestamp
→ Log USER_LEFT Event
→ If Leader Leaving: Reassign Leader to Next Authorized User
→ Session Complete
```

**Leader Reassignment Rules:**
1. Find project owner among remaining users
2. If none: Find member with "owner" role
3. If none: Find authorized researcher/admin
4. If none: No leader assigned

---

## Diagram Features

### Visual Organization

**Subgraphs:**
- 🔐 Authentication Layer (green border)
- 📁 Project Management (blue border)
- 💻 Collaborative IDE Workspace (cyan border)
- 🤖 AI Assistance Pipeline (teal border)

**Color Coding:**
- **Green:** Start/End points
- **Blue:** Process steps
- **Yellow:** Decision points
- **Red:** Error/denial states
- **Purple:** MongoDB storage operations
- **Teal:** AI/RAG components

### Parallel Feature Representation

Independent workspace features branch from a central decision point and return to the workspace, accurately reflecting that:
- Features can be used in any order
- Users can switch between features freely
- No forced sequential flow

### AI Pipeline Expansion

The AI Assistance branch is **fully expanded** to show:
- All 4 retrieval channels
- Evidence construction and validation
- LLM generation and claim verification
- Multiple exit paths (success, insufficient evidence, unsupported claims)

---

## Technology Stack (Verified)

### Frontend
- React 19.0.0 + Vite 6.2.0
- Monaco Editor (VS Code engine)
- Socket.IO Client 4.8.3
- WebRTC (native browser APIs)

### Backend
- Node.js + Express 4.21.2
- Socket.IO Server 4.8.1
- MongoDB + Mongoose 9.9.3
- JWT authentication

### AI Service
- Python FastAPI 0.115.0+
- ChromaDB 0.6.0+
- sentence-transformers 6.1.0 (all-MiniLM-L6-v2)
- Ollama (local LLM runtime)

### Code Execution
- Piston API (primary)
- Local subprocess fallback (Node.js, Python)

---

## How to Use This Diagram

### For Project Reports
1. **Export to PNG/SVG:**
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   mmdc -i devshare_overall_workflow.mmd -o devshare_workflow.png -w 3000
   ```

2. **Include in LaTeX:**
   ```latex
   \begin{figure}[H]
   \centering
   \includegraphics[width=\textwidth]{devshare_workflow.png}
   \caption{DevShare Overall System Workflow}
   \end{figure}
   ```

### For Presentations
- **High-level overview:** Show Authentication → Project Management → Workspace
- **Feature details:** Zoom into specific branches (AI, Execution, WebRTC)
- **Technical depth:** Explain AI Pipeline expansion with 4 retrieval channels

### For Viva Defense

**Suggested Talking Points:**

1. **Authentication:** "We use JWT-based authentication with MongoDB for user management"

2. **Real-Time Collaboration:** "Socket.IO provides bidirectional communication for code synchronization with 2-second debounced auto-save"

3. **Leader Mode:** "Server-enforced permission system based on project ownership, not client-side trust"

4. **AI Assistance:** "Hybrid retrieval combines 4 channels: exact filename, BM25 lexical, ChromaDB semantic, and dependency graph"

5. **Evidence Grounding:** "We validate LLM claims against provided evidence to prevent hallucination and ensure source citation"

6. **Code Execution:** "Primary execution via Piston API with local Node.js/Python fallback for reliability"

7. **Interview Mode:** "Explicit consent-based focus tracking for research, not browser lockdown or cheating detection"

8. **Research Analytics:** "Session event logging enables quantitative analysis of collaboration patterns"

---

## Accuracy Notes

**What This Diagram Shows (Verified Implementation):**
- ✅ React/Vite frontend with Monaco Editor
- ✅ Node.js/Express backend with Socket.IO
- ✅ MongoDB persistence (9 data models)
- ✅ Python FastAPI AI service
- ✅ 4-channel hybrid retrieval (filename, BM25, vector, dependency)
- ✅ Genuine semantic embeddings (sentence-transformers)
- ✅ Local Ollama/Qwen LLM runtime
- ✅ Piston + local fallback execution
- ✅ WebRTC full-mesh communication
- ✅ Server-enforced leader mode permissions
- ✅ Consent-based interview telemetry
- ✅ Session analytics and CSV/JSON export

**What This Diagram Does NOT Show (Not Implemented):**
- ❌ Next.js (uses Vite)
- ❌ VS Code extension (web-based only)
- ❌ S3 storage (MongoDB only)
- ❌ CRDT or operational transformation
- ❌ Automatic conflict resolution
- ❌ Browser lockdown or screen recording
- ❌ Rate limiting middleware

---

## Maintenance

**Last Updated:** December 2024 (Post-Embedding Fix)

**Update Triggers:**
- New major feature implementation
- Architecture changes
- Technology stack updates

**Validation:** All components verified against source code in `implementation_audit.md`

---

## Questions for Evaluation

**Expected Questions:**

1. **"How does real-time collaboration work?"**
   - "Socket.IO broadcasts code changes to all peers with 2-second debounced MongoDB persistence"

2. **"What prevents AI hallucination?"**
   - "Evidence validation matches LLM claims to provided source code; unsupported claims are flagged"

3. **"How does hybrid retrieval improve accuracy?"**
   - "Four channels capture different query types: exact files, keywords, semantics, and dependencies"

4. **"What's the difference between Leader Mode and Interview Mode?"**
   - "Leader Mode controls edit permissions; Interview Mode tracks candidate focus for research"

5. **"Why local Ollama instead of cloud LLM?"**
   - "Privacy, cost, and latency benefits; cloud fallback available via OpenRouter"

---

**This diagram is ready for BTech project evaluation, mentor presentation, and viva defense.**
