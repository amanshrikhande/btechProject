"""
Embedding Engine for DevShare RAG Pipeline
Loads sentence-transformers/all-MiniLM-L6-v2 for semantic code embeddings.
Falls back to deterministic hash-based vectors if model loading fails.
"""
from typing import List
import numpy as np

class EmbeddingEngine:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.using_fallback = True
        self._loading = False
        self._load_error = None
        
        # Attempt to load model immediately on initialization
        self._load_model()

    def _load_model(self):
        """
        Load sentence-transformers model for semantic embeddings.
        If loading fails, sets using_fallback=True and logs error.
        """
        if self._loading or self.model is not None:
            return
        
        self._loading = True
        try:
            from sentence_transformers import SentenceTransformer
            print(f"[EmbeddingEngine] Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.using_fallback = False
            self._load_error = None
            print(f"[EmbeddingEngine] SUCCESS: Model loaded successfully: {self.model_name}")
            print(f"[EmbeddingEngine] SUCCESS: Semantic search enabled with genuine embeddings")
        except ImportError as e:
            self._load_error = f"sentence_transformers not installed: {e}"
            print(f"[EmbeddingEngine] FAILED: Could not import sentence_transformers: {e}")
            print(f"[EmbeddingEngine] WARNING: Using deterministic hash fallback (NO semantic meaning)")
            print(f"[EmbeddingEngine] INSTALL: pip install sentence-transformers")
        except Exception as e:
            self._load_error = f"Model load error: {e}"
            print(f"[EmbeddingEngine] FAILED: Could not load model {self.model_name}: {e}")
            print(f"[EmbeddingEngine] WARNING: Using deterministic hash fallback (NO semantic meaning)")
        finally:
            self._loading = False

    def _ensure_loaded(self):
        """Ensure model is loaded before use."""
        if self.model is None and not self._loading:
            self._load_model()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        Returns genuine sentence-transformer embeddings if available,
        otherwise deterministic hash-based fallback.
        """
        if not texts:
            return []

        self._ensure_loaded()
        
        # Use genuine sentence-transformers model if available
        if self.model is not None and not self.using_fallback:
            try:
                embeddings = self.model.encode(
                    texts, 
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    convert_to_numpy=True
                )
                return embeddings.tolist()
            except Exception as e:
                print(f"[EmbeddingEngine] Encoding error: {e}")
                print(f"[EmbeddingEngine] Falling back to hash-based embeddings for this batch")
                # Don't permanently set using_fallback; this might be a transient error

        # Deterministic 384-dimensional hashed embedding fallback
        return [self._hash_embed(t) for t in texts]

    def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query string."""
        return self.embed_documents([query])[0]

    def _hash_embed(self, text: str, dim: int = 384) -> List[float]:
        """
        Deterministic hash-based embedding fallback.
        WARNING: These vectors have NO semantic meaning.
        They are consistent per text but do not capture code semantics.
        """
        np.random.seed(abs(hash(text)) % (2**32))
        vec = np.random.randn(dim).astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
    
    def get_status(self) -> dict:
        """Return embedding engine status for diagnostics."""
        return {
            "model_name": self.model_name,
            "model_loaded": self.model is not None,
            "using_fallback": self.using_fallback,
            "semantic_search_enabled": not self.using_fallback,
            "load_error": self._load_error,
        }

# Global singleton instance
embedding_engine = EmbeddingEngine()
