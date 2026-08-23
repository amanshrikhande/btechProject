from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ..ml.model import analysis_engine
from ..rag.vectorstore import vector_store
from ..llm.prompt_builder import prompt_builder
from ..llm.ollama_client import ollama_client
from ..config import settings

router = APIRouter(prefix="/api", tags=["ai"])

class AnalyzeRequest(BaseModel):
    code: str
    language: Optional[str] = "javascript"

class IndexRequest(BaseModel):
    projectId: str
    files: List[Dict[str, Any]]

class QueryRAGRequest(BaseModel):
    projectId: str
    query: str
    top_k: Optional[int] = 3

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    active_file_name: Optional[str] = "main"
    active_code: Optional[str] = ""
    language: Optional[str] = "javascript"
    last_error: Optional[str] = None
    chat_history: Optional[List[Dict[str, Any]]] = []

@router.get("/health")
async def health_check():
    ollama_status = await ollama_client.check_health()
    return {
        "status": "healthy",
        "service": settings.app_name,
        "ollama": ollama_status,
        "codebert_device": str(analysis_engine.device),
    }

@router.post("/analyze")
async def analyze_code_endpoint(req: AnalyzeRequest):
    result = analysis_engine.analyze_code(req.code, req.language)
    return result

@router.post("/rag/index")
async def index_project_endpoint(req: IndexRequest):
    chunk_count = vector_store.index_project_files(req.projectId, req.files)
    return {
        "success": True,
        "projectId": req.projectId,
        "indexed_chunks": chunk_count,
    }

@router.post("/rag/query")
async def query_rag_endpoint(req: QueryRAGRequest):
    chunks = vector_store.query_project(req.projectId, req.query, req.top_k)
    return {
        "success": True,
        "projectId": req.projectId,
        "chunks": chunks,
    }

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    # 1. Retrieve RAG context if project_id is provided
    rag_snippets = []
    if req.project_id:
        rag_snippets = vector_store.query_project(req.project_id, req.message, top_k=2)

    # 2. Run CodeBERT defect analysis on active code
    ml_analysis = None
    if req.active_code and len(req.active_code.strip()) > 10:
        ml_analysis = analysis_engine.analyze_code(req.active_code, req.language)

    # 3. Build synthesized prompt
    prompt = prompt_builder.build_developer_prompt(
        user_message=req.message,
        active_file_name=req.active_file_name,
        active_code=req.active_code,
        language=req.language,
        rag_snippets=rag_snippets,
        ml_analysis=ml_analysis,
        last_error=req.last_error,
    )

    # 4. Query Ollama local LLM
    response_text = await ollama_client.generate_response(prompt)

    return {
        "response": response_text,
        "ml_analysis": ml_analysis,
        "retrieved_context": rag_snippets,
    }
