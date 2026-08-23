import httpx
from typing import Dict, Any, Optional
from ..config import settings

class OllamaClient:
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model

    async def check_health(self) -> Dict[str, Any]:
        """Check if local Ollama server is reachable."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    models = res.json().get("models", [])
                    return {
                        "online": True,
                        "available_models": [m.get("name") for m in models],
                        "active_model": self.model,
                    }
        except Exception as e:
            pass
        return {"online": False, "error": "Ollama server unreachable"}

    async def generate_response(self, prompt: str) -> str:
        """Query local Ollama LLM with synthesized prompt."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
                else:
                    return f"Ollama API returned status {res.status_code}: {res.text}"
        except Exception as e:
            # Informative fallback if Ollama service is not running locally
            return (
                f"**[Local LLM Notice]** Ollama is not currently running at `{self.base_url}`.\n\n"
                f"To activate local LLM inference:\n"
                f"1. Install and start Ollama (`ollama serve`)\n"
                f"2. Pull the coding model: `ollama run {self.model}`\n\n"
                f"*Static ML defect analysis & ChromaDB RAG remain operational.*"
            )

ollama_client = OllamaClient()
