# DevShare Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (Local, Docker, or Atlas)

---

## Option 1: MongoDB Atlas (Recommended for Quick Start)

### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a free cluster (M0 Sandbox)

### 2. Get Connection String
1. Click "Connect" on your cluster
2. Choose "Drivers" option
3. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/devshare`)

### 3. Update Environment Files
Update both `.env` and `backend/.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devshare?retryWrites=true&w=majority
```

### 4. Run Project
```bash
# Terminal 1: Frontend
cd frontend
npm install
npm run dev

# Terminal 2: Backend  
npm start

# Terminal 3: RAG Service
cd ai_service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Option 2: MongoDB with Docker (Recommended for Local Development)

### 1. Install Docker
- Windows: https://www.docker.com/products/docker-desktop
- Make sure Docker Desktop is running

### 2. Start MongoDB Container
```bash
docker-compose up
```

This will start MongoDB with credentials:
- Username: `devshare`
- Password: `devshare_password_2025`
- URI: `mongodb://devshare:devshare_password_2025@127.0.0.1:27017/devshare?authSource=admin`

### 3. The `.env` files are already configured for Docker

### 4. Run Project
Same as Option 1

---

## Option 3: MongoDB Community Edition (Local Installation)

### 1. Download MongoDB
- Windows: https://www.mongodb.com/try/download/community
- Choose Windows (msi)

### 2. Install MongoDB
- Run the MSI installer
- Choose "Install as a Service" (recommended)
- MongoDB starts automatically after installation

### 3. Verify Installation
```powershell
mongosh
# Should connect to local MongoDB at 127.0.0.1:27017
```

### 4. The `.env` files already use local MongoDB URI

### 5. Run Project
Same as Option 1

---

## Quick Start (All Services)

Once MongoDB is running, open three terminals:

### Terminal 1: Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Terminal 2: Backend (Node.js + Express)
```bash
npm install
npm start
# Runs at http://localhost:5000
```

### Terminal 3: RAG Service (Python + FastAPI)
```bash
cd ai_service
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Swagger UI at http://localhost:8000/docs
```

---

## Verify All Services

✅ **Frontend**: http://localhost:5173  
✅ **Backend API**: http://localhost:5000/api/health  
✅ **RAG Service**: http://localhost:8000/docs  

---

## Troubleshooting

### "Connection Refused" Error
**Cause**: MongoDB is not running
**Solution**:
- If using Docker: Run `docker-compose up`
- If using local MongoDB: Check if `mongod` service is running (Services > MongoDB)
- If using Atlas: Verify connection string in `.env`

### "Port Already in Use"
**Change port** in `.env` or service:
```
BACKEND: PORT=5001
FRONTEND: npm run dev -- --port 5174
RAG: --port 8001
```

### "Module Not Found" in Backend
```bash
npm install
```

### "Python Venv Not Found"
```bash
cd ai_service
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
```

---

## Architecture

```
Frontend (React + Vite + Socket.IO Client)
    ↓
Backend (Express + Socket.IO Server)
    ↓
MongoDB (Database)
    ↓
RAG Service (FastAPI + ChromaDB + Ollama)
```

---

## Project Structure

```
DevShare/
├── frontend/          # React 19 + Vite 6
├── backend/           # Node.js/Express
├── ai_service/        # Python/FastAPI RAG
├── docker-compose.yml # MongoDB + optional services
└── .env               # Configuration
```

---

## Next Steps

1. Choose a MongoDB setup option above
2. Follow the quick start steps
3. Access the application at http://localhost:5173
4. Start collaborating!
