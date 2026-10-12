import os
import re
import ast
import time
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from .chunker import chunker
from .embeddings import embedding_engine
from .lexical_search import lexical_store
from .dependency_graph import dependency_manager
from .hybrid_retriever import hybrid_retriever

IGNORED_PATTERNS = [
    "node_modules", ".git", ".env", "package-lock.json", "yarn.lock",
    ".DS_Store", "__pycache__", ".venv", "dist", "build", ".min.js",
    ".min.css", ".map", ".sqlite", ".db"
]

class ProjectVectorStore:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = None
        self._memory_store: Dict[str, List[Dict[str, Any]]] = {}
        self._project_files: Dict[str, List[Dict[str, Any]]] = {}
        self._project_metadata: Dict[str, Dict[str, Any]] = {}
        self._file_hashes: Dict[str, Dict[str, str]] = {}
        self._init_chroma()

    def _init_chroma(self):
        os.makedirs(self.persist_directory, exist_ok=True)
        try:
            import chromadb
            self.client = chromadb.PersistentClient(path=self.persist_directory)
            print(f"[ChromaDB] Initialized PersistentClient in {self.persist_directory}")
        except Exception as e:
            print(f"[ChromaDB Warning] Could not start ChromaDB PersistentClient: {e}. Operating in memory cache.")
            self.client = None

    def _get_collection_name(self, project_id: str) -> str:
        safe_id = "".join([c if c.isalnum() else "_" for c in str(project_id)])
        return f"proj_{safe_id}"[:63]

    def _normalize_language(self, language: str, file_name: str = "") -> str:
        """Return one canonical language name for file and metadata comparisons."""
        value = (language or "").strip().lower()
        if not value and file_name:
            value = os.path.splitext(file_name)[1].lstrip(".").lower()
        aliases = {
            "py": "python",
            "js": "javascript",
            "jsx": "javascript",
            "ts": "typescript",
            "tsx": "typescript",
            "cc": "cpp",
            "hpp": "cpp",
            "c++": "cpp",
        }
        return aliases.get(value, value or "javascript")

    def _should_index_file(self, file_path: str, file_name: str) -> bool:
        low_path = (file_path or file_name or "").lower()
        for ignored in IGNORED_PATTERNS:
            if ignored in low_path:
                return False
        if low_path.endswith((".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".exe", ".bin", ".zip", ".tar")):
            return False
        if "id_rsa" in low_path or "secret" in low_path or ".pem" in low_path:
            return False
        return True

    def _extract_imports_from_code(self, content: str, language: str) -> List[str]:
        """
        Extract imported module/file names from source code.
        """
        lang = (language or "").lower()
        imports = []

        if lang in ("python", "py"):
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name.split(".")[0])
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module.split(".")[0])
            except Exception:
                # Regex fallback for Python
                matches = re.findall(r'^(?:from\s+([a-zA-Z0-9_]+)|import\s+([a-zA-Z0-9_]+))', content, re.MULTILINE)
                for m1, m2 in matches:
                    imports.append(m1 or m2)

        elif lang in ("javascript", "js", "jsx", "typescript", "ts", "tsx"):
            # ES6 imports and CommonJS requires
            es_imports = re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', content)
            cjs_imports = re.findall(r'require\s*\(\s*[\'"]([^\'"]+)[\'"]', content)
            dynamic_imports = re.findall(r'import\s*\(\s*[\'"]([^\'"]+)[\'"]', content)
            for imp in es_imports + cjs_imports + dynamic_imports:
                base = os.path.basename(imp).replace(".js", "").replace(".ts", "").replace(".jsx", "").replace(".tsx", "")
                imports.append(base)

        elif lang in ("c", "cpp", "h", "hpp"):
            matches = re.findall(r'#include\s+["<]([^">]+)[">]', content)
            for m in matches:
                imports.append(os.path.basename(m))

        elif lang in ("java",):
            matches = re.findall(r'import\s+([a-zA-Z0-9_.]+);', content)
            for m in matches:
                imports.append(m.split(".")[-1])

        return sorted(list(set(filter(None, imports))))

    def _ensure_project_loaded(self, project_id: str):
        """
        Rehydrate _project_files and _memory_store from persistent ChromaDB collection.
        Ensures AST analysis and direct file matching work across service restarts.
        """
        pid_str = str(project_id)
        if (not self._project_files.get(pid_str)) and self.client is not None:
            coll_name = self._get_collection_name(pid_str)
            try:
                coll = self.client.get_collection(name=coll_name)
                data = coll.get(include=["metadatas", "documents"])
                if data and data.get("metadatas"):
                    seen_files = {}
                    reconstructed_chunks = []
                    for idx, m in enumerate(data["metadatas"]):
                        fn = m.get("fileName")
                        doc_text = data["documents"][idx] if data.get("documents") else ""
                        file_id = str(m.get("fileId") or "")
                        file_path = m.get("filePath", f"/{fn}")
                        file_hash = m.get("fileContentHash") or ""
                        reconstructed_chunks.append({
                            "id": data["ids"][idx],
                            "text": doc_text,
                            "content": doc_text,
                            "metadata": m,
                            "filePath": file_path,
                        })
                        if file_hash:
                            hash_record = {
                                "fileId": file_id,
                                "filePath": file_path,
                                "fileContentHash": file_hash,
                                "indexedAt": m.get("indexedAt", ""),
                            }
                            if file_id:
                                self._file_hashes.setdefault(pid_str, {})[file_id] = hash_record
                            if file_path:
                                self._file_hashes.setdefault(pid_str, {})[file_path] = hash_record
                        if fn and fn not in seen_files:
                            seen_files[fn] = {
                                "fileName": fn,
                                "filePath": file_path,
                                "language": m.get("language", ""),
                                "content": doc_text,
                            }
                        elif fn and doc_text and not seen_files[fn].get("content"):
                            seen_files[fn]["content"] = doc_text
                    self._memory_store[pid_str] = reconstructed_chunks
                    self._project_files[pid_str] = list(seen_files.values())
                    if reconstructed_chunks:
                        lexical_store.index_project_chunks(pid_str, reconstructed_chunks)
                    if self._project_files[pid_str]:
                        dependency_manager.build_project_graph(pid_str, self._project_files[pid_str])
            except Exception as e:
                pass

    def analyze_file_dependencies(self, project_id: str, target_file_name: str) -> Dict[str, Any]:
        """
        Perform bidirectional import and dependency analysis for target file.
        Returns:
          - targetFile: Name of file
          - rawImports: All detected import symbols
          - internalImports: Other project files imported by target
          - externalImports: Standard / 3rd party packages
          - importedBy: Other project files that import target
          - relationshipSummary: Verified human-readable summary
        """
        pid_str = str(project_id)
        self._ensure_project_loaded(pid_str)
        files = self._project_files.get(pid_str, [])
        target_file = None
        other_files = []

        norm_target = os.path.basename(target_file_name).lower()

        for f in files:
            fname = os.path.basename(f.get("fileName") or f.get("name", "")).lower()
            if fname == norm_target:
                target_file = f
            else:
                other_files.append(f)

        if not target_file:
            return {
                "targetFile": target_file_name,
                "found": False,
                "internalImports": [],
                "externalImports": [],
                "importedBy": [],
                "relationshipSummary": f"File '{target_file_name}' not found in indexed project files.",
            }

        target_content = target_file.get("content", "")
        target_lang = target_file.get("language", "")
        raw_imports = self._extract_imports_from_code(target_content, target_lang)

        # Classify imports into internal project files vs external
        internal_imports = []
        external_imports = []

        other_file_map = {}
        for of in other_files:
            of_name = os.path.basename(of.get("fileName") or of.get("name", ""))
            of_stem = os.path.splitext(of_name)[0].lower()
            other_file_map[of_stem] = of_name
            other_file_map[of_name.lower()] = of_name

        for imp in raw_imports:
            imp_clean = imp.lower()
            if imp_clean in other_file_map:
                internal_imports.append(other_file_map[imp_clean])
            else:
                external_imports.append(imp)

        # Check reverse dependencies (who imports target_file?)
        target_stem = os.path.splitext(norm_target)[0]
        imported_by = []

        for of in other_files:
            of_name = of.get("fileName") or of.get("name", "")
            of_content = of.get("content", "")
            of_lang = of.get("language", "")
            of_imports = self._extract_imports_from_code(of_content, of_lang)
            of_imports_lower = [x.lower() for x in of_imports]

            if target_stem in of_imports_lower or norm_target in of_imports_lower:
                imported_by.append(of_name)

        # Build precise verified summary
        parts = []
        if internal_imports:
            parts.append(f"Imports project file(s): {', '.join(internal_imports)}.")
        else:
            parts.append(f"Does NOT import any other files in this project (0 internal imports).")

        if imported_by:
            parts.append(f"Imported by project file(s): {', '.join(imported_by)}.")
        else:
            parts.append(f"Is NOT imported by any other project files.")

        if not internal_imports and not imported_by:
            parts.append(f"Status: '{target_file_name}' is currently a standalone file with no module connection to other project files.")

        return {
            "targetFile": target_file.get("fileName") or target_file.get("name"),
            "found": True,
            "rawImports": raw_imports,
            "internalImports": internal_imports,
            "externalImports": external_imports,
            "importedBy": imported_by,
            "relationshipSummary": " ".join(parts),
        }

    def index_project_files(self, project_id: str, files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Chunk and vector index valid project files into a project-isolated ChromaDB collection.
        """
        if embedding_engine.using_fallback:
            print(f"[VectorStore WARNING] Indexing project {project_id} with HASH FALLBACK embeddings.")
            print(f"[VectorStore WARNING] Semantic search will NOT work correctly.")
            print(f"[VectorStore WARNING] Install sentence-transformers and re-index after: pip install sentence-transformers")

        pid_str = str(project_id)
        valid_files = [
            {**f, "language": self._normalize_language(
                f.get("language", ""), f.get("fileName") or f.get("name", "")
            )}
            for f in files
            if self._should_index_file(f.get("filePath", ""), f.get("fileName", f.get("name", "")))
        ]

        # Store complete file contents for direct file and dependency retrieval
        self._project_files[pid_str] = valid_files

        # Track authoritative SHA-256 fileContentHash for change & stale detection
        file_hashes = {}
        for f in valid_files:
            content = f.get("content", "") or ""
            fid = str(f.get("fileId") or f.get("_id") or "")
            fn = f.get("filePath") or f.get("fileName") or f.get("name") or "file"
            f_content_hash = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
            hash_rec = {
                "fileId": fid,
                "filePath": fn,
                "fileContentHash": f_content_hash,
                "indexedAt": datetime.utcnow().isoformat() + "Z",
            }
            if fid:
                file_hashes[fid] = hash_rec
            file_hashes[fn] = hash_rec
        self._file_hashes[pid_str] = file_hashes

        all_chunks = []
        languages_set = set()

        for f in valid_files:
            if "content" in f and isinstance(f["content"], str):
                f["content"] = f["content"].replace("\\n", "\n").replace("\\t", "\t")
            file_chunks = chunker.chunk_file(f)
            all_chunks.extend(file_chunks)
            lang = self._normalize_language(f.get("language", ""), f.get("fileName", ""))
            if lang:
                languages_set.add(lang)

        # Build BM25 lexical index
        if all_chunks:
            lexical_store.index_project_chunks(pid_str, all_chunks)

        # Build multi-language dependency graph
        if valid_files:
            dependency_manager.build_project_graph(pid_str, valid_files)

        coll_name = self._get_collection_name(pid_str)
        chroma_indexed = False

        if all_chunks and self.client is not None:
            texts = [c["text"] for c in all_chunks]
            ids = [f"{c['id']}_{i}" for i, c in enumerate(all_chunks)]
            metadatas = []
            for c in all_chunks:
                m = c["metadata"].copy()
                # Ensure all metadata values are primitive for ChromaDB compatibility
                m["projectId"] = str(m.get("projectId", pid_str))
                m["fileId"] = str(m.get("fileId", ""))
                file_id = str(m.get("fileId", ""))
                file_record = next((f for f in valid_files if str(f.get("fileId") or f.get("_id") or "") == file_id), None)
                m["fileContentHash"] = str(
                    (file_record or {}).get("fileContentHash")
                    or file_hashes.get(file_id, {}).get("fileContentHash", "")
                )
                m["chunkHash"] = str(m.get("chunkHash", ""))
                m["indexedAt"] = str(m.get("indexedAt", ""))
                m["startLine"] = int(m.get("startLine", 1))
                m["endLine"] = int(m.get("endLine", 1))
                m["chunkIndex"] = int(m.get("chunkIndex", 0))
                m["symbol"] = str(m.get("symbol", ""))
                m["symbolType"] = str(m.get("symbolType", "block"))
                metadatas.append(m)

            try:
                embeddings = embedding_engine.embed_documents(texts)
                try:
                    self.client.delete_collection(name=coll_name)
                except Exception:
                    pass

                collection = self.client.create_collection(
                    name=coll_name,
                    metadata={"hnsw:space": "cosine"}
                )
                collection.add(
                    ids=ids,
                    documents=texts,
                    embeddings=embeddings,
                    metadatas=metadatas,
                )
                chroma_indexed = True
            except Exception as e:
                print(f"[ChromaDB Index Error]: {e}")

        # Maintain in-memory store for fallback / fast lookup
        self._memory_store[pid_str] = all_chunks

        meta_record = {
            "projectId": pid_str,
            "collection": coll_name,
            "collectionName": coll_name,
            "indexedFiles": len(valid_files),
            "filesCount": len(valid_files),
            "indexedChunks": len(all_chunks),
            "chunksCount": len(all_chunks),
            "languages": sorted(list(languages_set)),
            "lastIndexedAt": datetime.utcnow().isoformat() + "Z",
            "lastIndexed": datetime.utcnow().isoformat() + "Z",
            "embeddingModel": embedding_engine.model_name if not embedding_engine.using_fallback else "hash_fallback",
            "chromadb": chroma_indexed,
            "status": "READY" if all_chunks and not embedding_engine.using_fallback else ("EMPTY" if not all_chunks else "HASH_FALLBACK"),
        }
        self._project_metadata[pid_str] = meta_record

        return meta_record

    def check_index_consistency(self, project_id: str, current_files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Verifies MongoDB/backend source files against derived ChromaDB index.
        Compares authoritative fileContentHash of current files against indexed hashes.
        If hashes differ or files are missing, returns INDEX_STALE.
        """
        pid_str = str(project_id)
        self._ensure_project_loaded(pid_str)
        indexed_map = self._file_hashes.get(pid_str, {})

        stale_files = []
        missing_files = []
        up_to_date_files = []

        for f in current_files:
            fid = str(f.get("fileId") or f.get("_id") or "")
            fpath = f.get("filePath") or f.get("path") or f.get("fileName") or ""
            content = f.get("content", "") or ""
            cur_hash = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()

            # Check by fileId (primary identity) or path
            indexed_info = indexed_map.get(fid) or indexed_map.get(fpath)
            if not indexed_info:
                missing_files.append({"fileId": fid, "filePath": fpath, "reason": "NOT_IN_INDEX"})
            elif indexed_info.get("fileContentHash") != cur_hash:
                stale_files.append({
                    "fileId": fid,
                    "filePath": fpath,
                    "currentHash": cur_hash,
                    "indexedHash": indexed_info.get("fileContentHash"),
                    "reason": "CONTENT_HASH_MISMATCH"
                })
            else:
                up_to_date_files.append(fid)

        is_stale = len(stale_files) > 0 or len(missing_files) > 0
        status = "INDEX_STALE" if is_stale else "READY"

        return {
            "projectId": pid_str,
            "isStale": is_stale,
            "status": status,
            "staleFiles": stale_files,
            "missingFiles": missing_files,
            "upToDateCount": len(up_to_date_files),
            "totalChecked": len(current_files),
        }

    def reindex_file(self, project_id: str, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Incrementally updates a single file in ChromaDB, BM25, and dependency graph
        without rebuilding the entire project vector index.
        """
        pid_str = str(project_id)
        self._ensure_project_loaded(pid_str)

        fid = str(file_data.get("fileId") or file_data.get("_id") or "")
        fname = file_data.get("fileName") or file_data.get("name", "file")
        fpath = file_data.get("filePath") or file_data.get("path", f"/{fname}")
        content = file_data.get("content", "") or ""
        lang = self._normalize_language(
            file_data.get("language", ""), fname
        )

        f_content_hash = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()

        # Delete old chunks for fid from ChromaDB
        coll_name = self._get_collection_name(pid_str)
        if self.client is not None and fid:
            try:
                coll = self.client.get_collection(name=coll_name)
                coll.delete(where={"fileId": fid})
            except Exception:
                pass

        # Delete old chunks from memory store
        if pid_str in self._memory_store:
            self._memory_store[pid_str] = [
                c for c in self._memory_store[pid_str]
                if str(c.get("metadata", {}).get("fileId")) != fid and c.get("metadata", {}).get("filePath") != fpath
            ]

        # Update project files
        p_files = self._project_files.get(pid_str, [])
        updated_files = [
            f for f in p_files
            if str(f.get("fileId") or f.get("_id")) != fid and (f.get("filePath") or f.get("path")) != fpath
        ]
        file_record = {
            "fileId": fid,
            "fileName": fname,
            "filePath": fpath,
            "content": content,
            "language": lang,
            "fileContentHash": f_content_hash,
        }
        updated_files.append(file_record)
        self._project_files[pid_str] = updated_files

        # Generate new chunks
        new_chunks = chunker.chunk_file(file_record)

        # Add new chunks to ChromaDB
        if new_chunks and self.client is not None:
            try:
                coll = self.client.get_collection(name=coll_name)
                texts = [c["text"] for c in new_chunks]
                ids = [f"{c['id']}_{int(time.time() * 1000)}_{i}" for i, c in enumerate(new_chunks)]
                embeddings = embedding_engine.embed_documents(texts)
                metadatas = []
                for c in new_chunks:
                    m = c["metadata"].copy()
                    m["projectId"] = pid_str
                    m["fileId"] = fid
                    m["fileContentHash"] = f_content_hash
                    m["chunkHash"] = str(m.get("chunkHash", ""))
                    m["startLine"] = int(m.get("startLine", 1))
                    m["endLine"] = int(m.get("endLine", 1))
                    m["chunkIndex"] = int(m.get("chunkIndex", 0))
                    m["symbol"] = str(m.get("symbol", ""))
                    m["symbolType"] = str(m.get("symbolType", "block"))
                    metadatas.append(m)
                coll.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
            except Exception as e:
                print(f"[Incremental Reindex Chroma Error]: {e}")

        if pid_str not in self._memory_store:
            self._memory_store[pid_str] = []
        self._memory_store[pid_str].extend(new_chunks)

        # Reindex BM25 and dependencies
        lexical_store.index_project_chunks(pid_str, self._memory_store[pid_str])
        dependency_manager.build_project_graph(pid_str, self._project_files[pid_str])

        if pid_str not in self._file_hashes:
            self._file_hashes[pid_str] = {}
        hash_rec = {
            "fileId": fid,
            "filePath": fpath,
            "fileContentHash": f_content_hash,
            "indexedAt": datetime.utcnow().isoformat() + "Z",
        }
        if fid:
            self._file_hashes[pid_str][fid] = hash_rec
        if fpath:
            self._file_hashes[pid_str][fpath] = hash_rec

        return {
            "success": True,
            "status": "READY",
            "fileId": fid,
            "filePath": fpath,
            "chunksCount": len(new_chunks),
            "fileContentHash": f_content_hash,
        }

    def remove_file_from_index(self, project_id: str, file_id: str) -> Dict[str, Any]:
        """
        Removes a deleted file from ChromaDB, BM25 index, and dependency graph.
        """
        pid_str = str(project_id)
        self._ensure_project_loaded(pid_str)
        fid = str(file_id)

        coll_name = self._get_collection_name(pid_str)
        if self.client is not None and fid:
            try:
                coll = self.client.get_collection(name=coll_name)
                coll.delete(where={"fileId": fid})
            except Exception:
                pass

        if pid_str in self._memory_store:
            self._memory_store[pid_str] = [
                c for c in self._memory_store[pid_str]
                if str(c.get("metadata", {}).get("fileId")) != fid
            ]

        if pid_str in self._project_files:
            self._project_files[pid_str] = [
                f for f in self._project_files[pid_str]
                if str(f.get("fileId") or f.get("_id")) != fid
            ]

        if pid_str in self._file_hashes:
            self._file_hashes[pid_str].pop(fid, None)

        lexical_store.index_project_chunks(pid_str, self._memory_store.get(pid_str, []))
        dependency_manager.build_project_graph(pid_str, self._project_files.get(pid_str, []))

        return {
            "success": True,
            "status": "READY",
            "fileId": fid,
            "deleted": True,
        }


    def get_project_status(self, project_id: str) -> Dict[str, Any]:
        """
        Return verified indexing diagnostic status for a project.
        """
        pid_str = str(project_id)
        self._ensure_project_loaded(pid_str)
        if pid_str in self._project_metadata:
            meta = self._project_metadata[pid_str].copy()
            meta["projectId"] = pid_str
            meta["collection"] = meta.get("collection") or meta.get("collectionName")
            meta["indexedFiles"] = meta.get("indexedFiles", meta.get("filesCount", 0))
            meta["indexedChunks"] = meta.get("indexedChunks", meta.get("chunksCount", 0))
            meta["lastIndexedAt"] = meta.get("lastIndexedAt", meta.get("lastIndexed"))
            meta["embeddingModel"] = embedding_engine.model_name if not embedding_engine.using_fallback else "hash_fallback"
            meta["status"] = "ready" if meta.get("indexedChunks", 0) > 0 else "NOT_INDEXED"
            meta["languages"] = sorted({
                self._normalize_language(f.get("language", ""), f.get("fileName", ""))
                for f in self._project_files.get(pid_str, [])
                if f.get("language") or f.get("fileName")
            }) or meta.get("languages", [])
            return meta

        # Check if collection exists in ChromaDB
        coll_name = self._get_collection_name(pid_str)
        if self.client is not None:
            try:
                coll = self.client.get_collection(name=coll_name)
                if coll:
                    cnt = coll.count()
                    files_cnt = len(self._project_files.get(pid_str, [])) or (1 if cnt > 0 else 0)
                    languages = sorted({
                        self._normalize_language(f.get("language", ""), f.get("fileName", ""))
                        for f in self._project_files.get(pid_str, [])
                        if f.get("language") or f.get("fileName")
                    })
                    return {
                        "projectId": pid_str,
                        "collection": coll_name,
                        "collectionName": coll_name,
                        "indexedFiles": files_cnt,
                        "filesCount": files_cnt,
                        "indexedChunks": cnt,
                        "chunksCount": cnt,
                        "languages": languages,
                        "lastIndexedAt": "Available in ChromaDB",
                        "lastIndexed": "Available in ChromaDB",
                        "embeddingModel": embedding_engine.model_name if not embedding_engine.using_fallback else "hash_fallback",
                        "chromadb": True,
                        "status": "READY" if cnt > 0 and not embedding_engine.using_fallback else "EMPTY",
                    }
            except Exception:
                pass

        return {
            "projectId": pid_str,
            "collection": coll_name,
            "collectionName": coll_name,
            "indexedFiles": 0,
            "filesCount": 0,
            "indexedChunks": 0,
            "chunksCount": 0,
            "languages": [],
            "lastIndexedAt": None,
            "lastIndexed": None,
            "embeddingModel": embedding_engine.model_name if not embedding_engine.using_fallback else "hash_fallback",
            "chromadb": self.client is not None,
            "status": "NOT_INDEXED",
        }

    def _find_mentioned_files(self, project_id: str, query: str) -> List[Dict[str, Any]]:
        """
        Detect files explicitly mentioned in query by filename or basename.
        """
        pid_str = str(project_id)
        self._ensure_project_loaded(pid_str)
        files = self._project_files.get(pid_str, [])
        if not files:
            # Fallback to memory store chunk metadata
            chunks = self._memory_store.get(pid_str, [])
            seen_files = {}
            for c in chunks:
                m = c.get("metadata", {})
                fn = m.get("fileName")
                if fn and fn not in seen_files:
                    seen_files[fn] = {
                        "fileName": fn,
                        "filePath": m.get("filePath", f"/{fn}"),
                        "language": m.get("language", ""),
                        "content": "",
                    }
            files = list(seen_files.values())

        query_lower = query.lower()
        matched_files = []

        # 1. Regex search for explicit filename pattern in query
        explicit_tokens = re.findall(r'[\w.-]+\.(?:py|js|jsx|ts|tsx|cpp|c|h|java|json|html|css|md)', query_lower)

        for f in files:
            fname = os.path.basename(f.get("fileName") or f.get("name", "")).lower()
            fstem = os.path.splitext(fname)[0]

            # Match if filename explicitly in query tokens or query text
            if fname in explicit_tokens or fname in query_lower:
                matched_files.append(f)
            elif len(fstem) >= 3 and f" {fstem} " in f" {query_lower} ":
                matched_files.append(f)

        return matched_files

    def query_project(self, project_id: str, query: str, top_k: int = 6) -> Dict[str, Any]:
        """
        Hybrid project-aware code retrieval combining:
        1. Exact filename / path / symbol matching
        2. Lexical keyword retrieval (Okapi BM25)
        3. Semantic vector retrieval (ChromaDB + sentence-transformers)
        4. Code structure & static dependency graph traversal
        5. Candidate fusion & normalized reranking
        """
        return hybrid_retriever.retrieve(project_id, query, self, top_k=top_k)

vector_store = ProjectVectorStore()
