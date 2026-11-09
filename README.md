# DevShare

A real-time collaborative code editor with an AI-powered RAG assistant, remote code execution, and research analytics. DevShare lets multiple developers edit the same files simultaneously in the browser, run code in a sandboxed environment, and ask an AI assistant questions that are grounded in the project's actual source code.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Installation and Setup](#installation-and-setup)
6. [Running the Project](#running-the-project)
7. [Environment Variables](#environment-variables)
8. [Usage Guide](#usage-guide)
9. [Architecture Summary](#architecture-summary)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Overview

DevShare is a three-tier web application:

- **Tier 1 (Frontend):** A React 19 single-page application served by Vite. Provides a Monaco-based code editor, file tree, terminal panel, and an AI assistant chat drawer.
- **Tier 2 (Backend):** A Node.js Express server with Socket.IO. Handles authentication, project and file management, real-time code synchronization, code execution proxying, and session analytics logging. Uses MongoDB for persistence.
- **Tier 3 (AI Service):** A Python FastAPI service that powers the RAG (Retrieval-Augmented Generation) pipeline. Indexes project files into a ChromaDB vector database, retrieves relevant code chunks using a hybrid 4-channel scoring strategy, queries an LLM, and validates responses against retrieved evidence.

### Key Features

- Real-time multi-user code editing with WebSocket synchronization
- Leader Mode for controlled editing (interviews, demonstrations)
- Code execution in JavaScript, Python, C++, Java, and TypeScript via the Piston API
- AI assistant that answers questions grounded in your project source code
- Version snapshots with manual and automatic triggers
- WebRTC peer-to-peer audio and video
- Session event logging for research (31 event types)
- NASA-TLX cognitive workload questionnaire integration
- CSV analytics export for researchers

---

## Technology Stack

### Frontend

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19.0.0 | UI component framework |
| Vite | 6.2.0 | Build tool and dev server |
| Tailwind CSS | 4.3.3 | Utility-first CSS framework |
| Monaco Editor (@monaco-editor/react) | 4.7.0 | In-browser code editor (VS Code engine) |
| Socket.IO Client | 4.8.1 | WebSocket client for real-time sync |
| Axios | 1.19.0 | HTTP client for REST API calls |
| React Router DOM | 7.18.2 | Client-side routing |
| React Markdown | 10.1.0 | Markdown rendering for AI responses |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown plugin |
| Framer Motion | 13.1.1 | Animations and transitions |
| Lucide React | 1.33.0 | Icon library |
| clsx | 2.1.1 | Conditional class name utility |
| tailwind-merge | 3.6.0 | Tailwind class deduplication |
| ESLint | 9.21.0 | Code linting |
| @vitejs/plugin-react | 4.3.4 | React plugin for Vite |

### Backend

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | JavaScript runtime |
| Express | 4.21.2 | HTTP server and REST API framework |
| Socket.IO | 4.8.1 | WebSocket server for real-time events |
| Mongoose | 9.9.3 | MongoDB ODM with schema validation |
| bcryptjs | 3.0.3 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT authentication tokens |
| Axios | 1.7.7 | HTTP client (AI service and Piston calls) |
| cors | 2.8.6 | Cross-origin resource sharing |
| dotenv | 17.4.2 | Environment variable loading |
| nodemon | 3.1.4 | Auto-restart on file changes (dev) |
| mongodb-memory-server | 11.3.0 | In-memory MongoDB for tests |

### AI Service

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Language runtime |
| FastAPI | 0.115.0+ | Async HTTP framework |
| Uvicorn | 0.34.0+ | ASGI server |
| Pydantic | 2.10.0+ | Data validation and settings |
| ChromaDB | 0.6.0+ | Vector database for embeddings |
| sentence-transformers | 3.3.0+ | Embedding model (all-MiniLM-L6-v2) |
| PyTorch | 2.2.2 (CPU) | Neural network backend for embeddings |
| Transformers | 4.48.0+ | Hugging Face model loading |
| httpx | 0.28.0+ | Async HTTP client for LLM API calls |
| scikit-learn | 1.6.0+ | Cosine similarity and metrics |
| NumPy | 1.26.0+ | Numerical operations |

### Database and External Services

| Tool | Purpose |
|------|---------|
| MongoDB 8.x | Primary document database (users, projects, files, versions, sessions) |
| ChromaDB | Vector database (code chunk embeddings, file-based persistence) |
| Piston API | Remote code execution sandbox (https://emkc.org) |
| OpenRouter API | Cloud LLM provider (default model: openai/gpt-4o-mini) |
| Ollama | Local LLM fallback (default model: qwen2.5-coder:1.5b) |

### Development and Deployment Tools

| Tool | Purpose |
|------|---------|
| Docker | Containerization for each service |
| Docker Compose | Multi-container orchestration |
| Nginx | Static file server for production frontend |
| Git | Version control |
| ESLint | JavaScript and React code linting |

---

## Prerequisites

Before you begin, ensure the following are installed on your system:

1. **Node.js** version 20.x or later
   - Download from https://nodejs.org
   - Verify: `node --version`

2. **Python** version 3.11 or later
   - Download from https://www.python.org/downloads/
   - Verify: `python --version`

3. **MongoDB** version 6.0 or later (8.x recommended)
   - Download from https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas
   - Verify: `mongod --version`

4. **Git** for cloning the repository
   - Download from https://git-scm.com
   - Verify: `git --version`

5. **OpenRouter API Key** (optional but recommended for AI assistant)
   - Sign up at https://openrouter.ai
   - Without a key, the AI service falls back to a local Ollama instance

6. **Ollama** (optional, for local LLM fallback)
   - Download from https://ollama.com
   - Pull the model: `ollama pull qwen2.5-coder:1.5b`

---

## Project Structure

```
DevShare/
|-- package.json              # Root package (backend dependencies, scripts)
|-- .env                      # Root environment variables (backend)
|-- backend/
|   |-- index.js              # Express + Socket.IO server entry point
|   |-- config/
|   |   |-- config.js         # App configuration
|   |   |-- db.js             # MongoDB connection logic
|   |-- controllers/          # REST API controllers (9 files)
|   |-- middleware/           # Auth middleware (JWT verification)
|   |-- models/               # Mongoose schemas (6 models)
|   |-- routes/               # Express route definitions (9 files)
|   |-- services/             # External service integrations (Piston)
|   |-- sockets/              # Socket.IO event handlers
|-- frontend/
|   |-- package.json          # Frontend dependencies
|   |-- src/
|   |   |-- App.jsx           # Root component and routing
|   |   |-- pages/            # Page components
|   |   |-- components/        # Reusable UI components
|   |   |-- context/          # React Context providers
|   |   |-- hooks/            # Custom React hooks (useWebRTC, etc.)
|-- ai_service/
|   |-- requirements.txt       # Python dependencies
|   |-- app/
|   |   |-- main.py            # FastAPI app and endpoints
|   |   |-- config.py          # Pydantic settings
|   |   |-- api/               # API route modules
|   |   |-- rag/               # RAG pipeline (chunker, retriever, vectorstore)
|   |   |-- llm/               # LLM integration and prompt builder
|   |   |-- intelligence/      # Evidence validation, code analysis
|   |   |-- ml/                # ML utilities
|-- docs/                     # Architecture and documentation
```

---

## Installation and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/DevShare.git
cd DevShare
```

### Step 2: Install Backend Dependencies

The root `package.json` contains backend dependencies. Install from the project root:

```bash
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 4: Set Up Environment Variables

Create three `.env` files. Use the templates below and fill in your values.

#### Root `.env` (Backend)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/devshare
JWT_SECRET=your_long_random_secret_string_here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://127.0.0.1:8000
CLIENT_URL=http://localhost:5173
```

#### `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_AI_SERVICE_URL=http://localhost:8000
```

#### `ai_service/.env`

```env
PORT=8000
HOST=0.0.0.0
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:1.5b
CHROMA_PERSIST_DIR=./chroma_db
CODEBERT_MODEL_NAME=microsoft/codebert-base
```

If you do not have an OpenRouter API key, set `OPENROUTER_API_KEY` to an empty string or omit it. The AI service will automatically fall back to a local Ollama instance. Make sure Ollama is running and the model is pulled:

```bash
ollama pull qwen2.5-coder:1.5b
```

### Step 5: Set Up the Python Virtual Environment

```bash
cd ai_service
python -m venv .venv
```

Activate the virtual environment:

- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```

- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate.bat
  ```

- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

If you encounter issues with PyTorch, install the CPU-only version first:

```bash
pip install torch==2.2.2 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

### Step 6: Start MongoDB

You have two options:

**Option A: Local MongoDB service**

Start the MongoDB daemon:

```bash
mongod --dbpath C:\data\db
```

On Windows, you can also start it as a service:

```powershell
Start-Service MongoDB
```

**Option B: MongoDB Atlas (cloud)**

Create a free cluster at https://www.mongodb.com/atlas, then update `MONGODB_URI` in your root `.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/devshare?retryWrites=true&w=majority
```

---

## Running the Project

You need four terminal windows (or tabs) running simultaneously.

### Terminal 1: MongoDB

If not already running as a service or in Docker:

```bash
mongod --dbpath /path/to/data/db
```

### Terminal 2: Backend

From the project root:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

You should see:

```
[DevShare Server] Running on http://localhost:5000 in development mode
[✓ MongoDB Connected] Host: 127.0.0.1
```

### Terminal 3: AI Service

```bash
cd ai_service
.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### Terminal 4: Frontend

```bash
cd frontend
npm run dev
```

You should see:

```
VITE v6.2.0  ready in 7000 ms
  Local:   http://localhost:5173/
```

### Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

---

## Environment Variables

### Backend (root `.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | Yes | 5000 | Backend server port |
| NODE_ENV | Yes | development | Environment mode |
| MONGODB_URI | Yes | mongodb://127.0.0.1:27017/devshare | MongoDB connection string |
| JWT_SECRET | Yes | - | Secret key for signing JWT tokens |
| JWT_EXPIRES_IN | No | 7d | JWT token expiration |
| AI_SERVICE_URL | Yes | http://127.0.0.1:8000 | Python AI service base URL |
| CLIENT_URL | Yes | http://localhost:5173 | Frontend URL (CORS) |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| VITE_BACKEND_URL | Yes | http://localhost:5000 | Backend API URL |
| VITE_AI_SERVICE_URL | Yes | http://localhost:8000 | AI service URL |

### AI Service (`ai_service/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 8000 | AI service port |
| HOST | No | 0.0.0.0 | Bind address |
| LLM_PROVIDER | No | openrouter | LLM routing preference |
| OPENROUTER_API_KEY | No | - | OpenRouter API key (omit to use Ollama) |
| OPENROUTER_MODEL | No | openai/gpt-4o-mini | Cloud LLM model |
| OLLAMA_BASE_URL | No | http://127.0.0.1:11434 | Local Ollama server URL |
| OLLAMA_MODEL | No | qwen2.5-coder:1.5b | Local LLM model |
| CHROMA_PERSIST_DIR | No | ./chroma_db | ChromaDB storage path |
| CODEBERT_MODEL_NAME | No | microsoft/codebert-base | CodeBERT model name |

---

## Usage Guide

### 1. Register an Account

1. Open `http://localhost:5173` in your browser.
2. Click **Register**.
3. Enter your name, email, and password.
4. Click **Create Account**.

### 2. Create a Project

1. After logging in, click **New Project**.
2. Enter a project name and select a default language.
3. Click **Create**.
4. You will be redirected to the workspace.

### 3. Write and Edit Code

1. The workspace shows a file tree on the left and the Monaco editor on the right.
2. Click any file in the tree to open it.
3. Type code directly in the editor.
4. Changes are synchronized to all connected users in real time.
5. Changes are auto-saved to MongoDB after 2 seconds of inactivity.

### 4. Run Code

1. Write your code in the editor.
2. Enter any input in the terminal stdin field if needed.
3. Click the **Run** button.
4. Output appears in the terminal panel at the bottom.
5. Supported languages: JavaScript, Python, C++, Java, TypeScript.

### 5. Invite Collaborators

1. Copy the room URL from the address bar.
2. Share it with another developer.
3. They log in and join the same room.
4. All connected users see each other's edits in real time.
5. Cursors and typing indicators are visible.

### 6. Use Leader Mode

1. The project owner can toggle **Leader Mode** from the toolbar.
2. When enabled, only the leader can edit code.
3. The leader can grant edit permission to specific users.
4. Non-editing users see a "View-only" indicator.
5. Useful for interviews and demonstrations.

### 7. Use the AI Assistant

1. Click the **AI Assistant** button on the right side of the workspace.
2. The chat drawer opens.
3. Type a question about your codebase, for example:
   - "How does authentication work?"
   - "What does the validate_token function do?"
   - "Find potential bugs in my code"
4. The AI retrieves relevant code chunks from your project and generates a grounded response.
5. Responses include source citations with file names and line numbers.
6. Click a citation to jump to that line in the editor.

### 8. Start a Video/Audio Call

1. Click the **Call** button in the toolbar.
2. Grant camera and microphone permissions in your browser.
3. Other users in the room can join the call.
4. Audio and video are peer-to-peer via WebRTC.

### 9. View Versions

1. Open the file you want to check.
2. Click the **Version History** button.
3. Browse saved snapshots.
4. Each snapshot shows the author, timestamp, and trigger type.
5. Click a version to view its content.

### 10. Export Analytics (Researchers Only)

1. Log in with an account that has `role: researcher` or `role: admin`.
2. Navigate to the Analytics page.
3. Select a dataset type (all events or AI-specific).
4. Click **Export CSV**.
5. The CSV file downloads with anonymized participant data.

---

## Architecture Summary

```
+-------------------+
|  Browser Client   |  React 19 + Vite + Monaco Editor
|  localhost:5173   |  Socket.IO Client, WebRTC, Axios
+--------+----------+
         |
         | HTTP (REST) + WebSocket (Socket.IO)
         |
+--------v----------+        +-------------------+
|  Node.js Backend  |        |   MongoDB         |
|  localhost:5000   |<------>|   Port 27017      |
|  Express + Socket |        |   Users, Projects |
|  Mongoose, JWT    |        |   Files, Versions |
+--------+----------+        |   Sessions, Events |
         |                   +-------------------+
         | HTTP (Axios)
         |
+--------v----------+        +-------------------+
|  Python AI Service|        |  ChromaDB         |
|  localhost:8000   |<------>|  ./chroma_db      |
|  FastAPI + Uvicorn|        |  Vector embeddings|
|  RAG Pipeline     |        +-------------------+
|  Hybrid Retriever |
|  Evidence Validator|
+--------+----------+
         |
         | HTTPS
         |
+--------v----------+
|  OpenRouter / Ollama
|  LLM (gpt-4o-mini / qwen2.5-coder)
+-------------------+
```

The AI service uses a 4-channel hybrid retrieval strategy:

| Channel | Weight | Description |
|---------|--------|-------------|
| Semantic (vector) | 0.40 | Cosine similarity via ChromaDB embeddings |
| Lexical (BM25) | 0.25 | Keyword matching via pure Python BM25 |
| Structural (dependency graph) | 0.20 | Import-based file relationships |
| Filename match | 0.15 | Direct file name matching from query |

Final score = 0.40 x semantic + 0.25 x lexical + 0.20 x structural + 0.15 x filename

---

## Troubleshooting

### MongoDB Connection Refused

**Symptom:** `[MongoDB Connection Error] connect ECONNREFUSED 127.0.0.1:27017`

**Fix:**
1. Verify MongoDB is running: `mongod --version`
2. Start the MongoDB daemon: `mongod --dbpath /path/to/data/db`
3. Check that the data directory exists and is writable
4. If using MongoDB Atlas, verify your connection string and network access

### Backend Starts in Demo Mode

**Symptom:** `[MongoDB unavailable - Running in DEMO MODE]`

**Fix:** This means MongoDB was not running when the backend started. Start MongoDB first, then restart the backend.

### AI Service Returns Fallback Embeddings

**Symptom:** AI responses are low quality or embeddings use hash-based fallback

**Fix:**
1. Ensure `sentence-transformers` and `torch` are installed correctly
2. The first run downloads the all-MiniLM-L6-v2 model (~80 MB), which requires internet access
3. Verify PyTorch loads: `python -c "import torch; print(torch.__version__)"`

### AI Service Uses Ollama Instead of OpenRouter

**Symptom:** AI responses come from Ollama even though you set an OpenRouter key

**Fix:**
1. Verify `OPENROUTER_API_KEY` is set and not empty in `ai_service/.env`
2. Restart the AI service after changing `.env`
3. Check the AI service logs for provider selection

### Frontend Cannot Connect to Backend

**Symptom:** API calls fail or WebSocket does not connect

**Fix:**
1. Verify the backend is running on port 5000
2. Check `VITE_BACKEND_URL` in `frontend/.env` matches the backend URL
3. Check browser console for CORS errors
4. Ensure `CLIENT_URL` in the backend `.env` matches your frontend origin

### Code Execution Fails

**Symptom:** Run button produces no output or an error

**Fix:**
1. The Piston API (https://emkc.org) must be accessible from your network
2. If Piston is down, the backend falls back to local execution (JavaScript and Python only)
3. Check the backend logs for execution errors
4. Ensure your code has no infinite loops (10-second timeout)

### Port Already in Use

**Symptom:** `EADDRINUSE` error when starting a service

**Fix:**
1. Find the process using the port:
   - Windows: `netstat -ano | findstr :5000`
   - macOS/Linux: `lsof -i :5000`
2. Stop the process or change the port in your `.env` file

---

## License

This project is licensed under the ISC License. See the `package.json` for details.
