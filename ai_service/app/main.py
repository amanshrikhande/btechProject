import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .config import settings

app = FastAPI(
    title=settings.app_name,
    description="Microservice providing CodeBERT defect analysis, ChromaDB RAG, and Ollama LLM integration",
    version="2.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "version": "2.0.0",
        "status": "operational",
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
