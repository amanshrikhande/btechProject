import os
from typing import List, Dict, Any
from .chunker import chunker
from .embeddings import embedding_engine

class ProjectVectorStore:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = None
        self._init_chroma()

    def _init_chroma(self):
        os.makedirs(self.persist_directory, exist_ok=True)
        try:
            import chromadb
            self.client = chromadb.PersistentClient(path=self.persist_directory)
        except Exception as e:
            print(f"[ChromaDB Warning] Could not start ChromaDB PersistentClient: {e}. Operating in memory cache.")
            self.client = None
        self._memory_store: Dict[str, List[Dict[str, Any]]] = {}

    def _get_collection_name(self, project_id: str) -> str:
        # Chroma collection names must be 3-63 characters alphanumeric
        safe_id = "".join([c if c.isalnum() else "_" for c in project_id])
        return f"proj_{safe_id}"[:63]

    def index_project_files(self, project_id: str, files: List[Dict[str, Any]]) -> int:
        """
        Chunk and vector index all files for a given project into ChromaDB.
        """
        all_chunks = []
        for f in files:
            file_chunks = chunker.chunk_file(f)
            all_chunks.extend(file_chunks)

        if not all_chunks:
            return 0

        texts = [c["text"] for c in all_chunks]
        ids = [c["id"] for c in all_chunks]
        metadatas = [c["metadata"] for c in all_chunks]
        embeddings = embedding_engine.embed_documents(texts)

        # Store in ChromaDB if available
        if self.client is not None:
            try:
                coll_name = self._get_collection_name(project_id)
                # Delete existing collection if present to refresh
                try:
                    self.client.delete_collection(name=coll_name)
                except Exception:
                    pass

                collection = self.client.create_collection(name=coll_name)
                collection.add(
                    ids=ids,
                    documents=texts,
                    embeddings=embeddings,
                    metadatas=metadatas,
                )
                return len(all_chunks)
            except Exception as e:
                print(f"[ChromaDB Index Error]: {e}")

        # In-memory fallback
        self._memory_store[project_id] = all_chunks
        return len(all_chunks)

    def query_project(self, project_id: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve top-k semantically relevant code chunks from the project vector collection.
        """
        query_embedding = embedding_engine.embed_query(query)

        if self.client is not None:
            try:
                coll_name = self._get_collection_name(project_id)
                collection = self.client.get_collection(name=coll_name)
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=min(top_k, collection.count()),
                )

                chunks = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
                    distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)

                    for doc, meta, dist in zip(docs, metas, distances):
                        chunks.append({
                            "content": doc,
                            "metadata": meta,
                            "filePath": meta.get("filePath", ""),
                            "startLine": meta.get("startLine", 1),
                            "endLine": meta.get("endLine", 1),
                            "score": round(1.0 - float(dist), 3) if dist else 0.9,
                        })
                return chunks
            except Exception as e:
                print(f"[ChromaDB Query Error]: {e}")

        # In-memory simple keyword fallback
        stored_chunks = self._memory_store.get(project_id, [])
        matched = []
        for c in stored_chunks:
            if any(word.lower() in c["text"].lower() for word in query.split() if len(word) > 3):
                matched.append({
                    "content": c["text"],
                    "metadata": c["metadata"],
                    "filePath": c["metadata"].get("filePath", ""),
                    "startLine": c["metadata"].get("startLine", 1),
                    "endLine": c["metadata"].get("endLine", 1),
                    "score": 0.85,
                })
        return matched[:top_k]

vector_store = ProjectVectorStore()
