import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "DevShare AI Service"
    port: int = int(os.getenv("PORT", 8000))
    host: str = os.getenv("HOST", "0.0.0.0")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    codebert_model_name: str = os.getenv("CODEBERT_MODEL_NAME", "microsoft/codebert-base")
    codebert_weights_path: str = os.getenv("CODEBERT_WEIGHTS_PATH", "./ml/saved_models/codebert_classifier.pt")
    
    class Config:
        env_file = ".env"

settings = Settings()
