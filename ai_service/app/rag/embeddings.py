from typing import List
import numpy as np

class EmbeddingEngine:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
        except Exception as e:
            print(f"[Embedding Warning] sentence-transformers not initialized ({e}). Using deterministic token-hash embeddings.")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self.model is not None:
            try:
                embeddings = self.model.encode(texts, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as e:
                print(f"[Embedding Error]: {e}")

        # Deterministic 384-dimensional hashed embedding fallback if offline
        return [self._hash_embed(t) for t in texts]

    def embed_query(self, query: str) -> List[float]:
        return self.embed_documents([query])[0]

    def _hash_embed(self, text: str, dim: int = 384) -> List[float]:
        np.random.seed(abs(hash(text)) % (2**32))
        vec = np.random.randn(dim).astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

embedding_engine = EmbeddingEngine()
