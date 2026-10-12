import os
from pathlib import Path

from pydantic_settings import BaseSettings


def _load_env_file_candidates() -> None:
    """Populate os.environ from the project-local .env files regardless of CWD."""
    candidates = [
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / ".env",
    ]

    seen = set()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        if str(resolved) in seen or not resolved.exists():
            continue
        seen.add(str(resolved))
        with open(resolved, "r", encoding="utf-8") as env_file:
            for line in env_file:
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                key, value = stripped.split("=", 1)
                key = key.strip()
                value = value.strip().strip("\"'")
                os.environ.setdefault(key, value)


_load_env_file_candidates()


class Settings(BaseSettings):
    app_name: str = "DevShare AI Service"
    port: int = int(os.getenv("PORT", 8000))
    host: str = os.getenv("HOST", "0.0.0.0")

    # Local Ollama compatibility settings (kept for local/offline use)
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:1.5b")

    # Remote API mode settings (preferred when an API key is configured)
    llm_provider: str = os.getenv("LLM_PROVIDER", "openrouter" if os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY") else "ollama")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    codebert_model_name: str = os.getenv("CODEBERT_MODEL_NAME", "microsoft/codebert-base")
    codebert_weights_path: str = os.getenv("CODEBERT_WEIGHTS_PATH", "./ml/saved_models/codebert_classifier.pt")

    class Config:
        env_file = str((Path(__file__).resolve().parent.parent / ".env"))


settings = Settings()
