"""
DevShare Hybrid Project-Aware Code Retriever
Combines:
  1. Exact Filename / Path / Symbol Matching
  2. Lexical / Keyword Search (Okapi BM25)
  3. Semantic Vector Search (ChromaDB + sentence-transformers)
  4. Code Structure & Dependency Graph Traversal
Performs Candidate Fusion and Normalized Reranking.
"""
from __future__ import annotations

import os
import re
import time
from typing import List, Dict, Any, Set, Tuple, Optional

from .lexical_search import lexical_store
from .dependency_graph import dependency_manager
from .embeddings import embedding_engine


class HybridRetriever:
    """
    Production-grade hybrid code retrieval system for arbitrary user queries.
    Weights are configurable and normalize scores across all 4 retrieval channels.
    """
    def __init__(
        self,
        w_semantic: Optional[float] = None,
        w_lexical: Optional[float] = None,
        w_structural: Optional[float] = None,
        w_filename: Optional[float] = None,
    ):
        # Configurable engineering defaults (not scientifically optimized)
        self.w_semantic = float(os.getenv("RAG_WEIGHT_SEMANTIC", "0.40")) if w_semantic is None else float(w_semantic)
        self.w_lexical = float(os.getenv("RAG_WEIGHT_LEXICAL", "0.25")) if w_lexical is None else float(w_lexical)
        self.w_structural = float(os.getenv("RAG_WEIGHT_STRUCTURAL", "0.20")) if w_structural is None else float(w_structural)
        self.w_filename = float(os.getenv("RAG_WEIGHT_FILENAME", "0.15")) if w_filename is None else float(w_filename)

    def _query_understanding(self, query: str, known_files: List[Dict[str, Any]], dep_graph) -> Dict[str, Any]:
        """
        Extract explicit filenames, paths, file extensions, and symbols mentioned in query.
        """
        query_lower = query.lower()
        mentioned_files = []
        matched_symbols = []

        # 1. Regex search for explicit filename / path patterns (e.g. main.py, database/user_repository.py)
        explicit_file_tokens = re.findall(r'[\w./\\-]+\.(?:py|js|jsx|ts|tsx|cpp|c|h|hpp|java|json|html|css|md)', query_lower)

        for f in known_files:
            fname = os.path.basename(f.get("fileName") or f.get("name", "")).lower()
            fpath = (f.get("filePath") or f.get("path", "")).lower().lstrip("/")
            fstem = os.path.splitext(fname)[0]

            is_match = False
            # Check exact path match
            if any(tok in fpath or fpath in tok for tok in explicit_file_tokens if len(tok) > 3):
                is_match = True
            # Check exact filename match
            elif fname in explicit_file_tokens or fname in query_lower:
                is_match = True
            # Check distinct stem match (only if stem is non-trivial >= 4 chars to avoid false positives)
            elif len(fstem) >= 4 and f" {fstem} " in f" {query_lower} ":
                is_match = True

            if is_match and f not in mentioned_files:
                mentioned_files.append(f)

        # 2. Check for symbols defined in the project mentioned in query
        words = re.findall(r'[a-zA-Z0-9_]{3,}', query)
        for w in words:
            sym_file_key = dep_graph.find_file_by_symbol(w)
            if sym_file_key and sym_file_key in dep_graph.files:
                f_info = dep_graph.files[sym_file_key]
                matched_symbols.append({"symbol": w, "file": f_info["fileName"]})
                # Add file as candidate if not already present
                if not any(os.path.basename(mf.get("fileName", "")).lower() == sym_file_key for mf in mentioned_files):
                    mentioned_files.append(f_info)

        return {
            "explicitTokens": explicit_file_tokens,
            "mentionedFiles": mentioned_files,
            "matchedSymbols": matched_symbols,
        }

    def _is_architecture_query(self, query: str, query_info: Dict[str, Any]) -> bool:
        """Identify project-wide questions that need breadth across files."""
        query_lower = (query or "").lower()
        architecture_terms = (
            "architecture", "system design", "project structure", "module structure",
            "dependency structure", "dependency graph", "interact", "interaction between",
            "complete flow", "full flow", "trace the", "all files", "every file",
            "project-wide", "how is the project", "directly depend", "depends on",
            "imported by", "which modules import", "what imports", "connects to",
            "connect to", "rest of the project",
        )
        explicit_file_count = len(query_info.get("mentionedFiles", []))
        return any(term in query_lower for term in architecture_terms) or explicit_file_count >= 4

    @staticmethod
    def _file_identity(candidate: Dict[str, Any]) -> str:
        """Use stable identity so same-named files do not collapse together."""
        identity = str(candidate.get("filePath") or candidate.get("fileId") or candidate.get("fileName")).replace("\\", "/").lower()
        return "/" + identity.lstrip("/")

    def _select_candidates(
        self,
        ranked_candidates: List[Dict[str, Any]],
        top_k: int,
        architecture_query: bool,
        target_file_names: List[str],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Select final evidence while preserving relevance and file coverage."""
        if not architecture_query:
            selected = ranked_candidates[:top_k]
            return selected, {
                "strategy": "score_descending",
                "uniqueFiles": len({self._file_identity(c) for c in selected}),
            }

        selected: List[Dict[str, Any]] = []
        selected_ids: Set[str] = set()
        target_names = {os.path.basename(name).lower() for name in target_file_names}

        # Explicitly named files are authoritative query targets.
        for candidate in ranked_candidates:
            if len(selected) >= top_k:
                break
            if os.path.basename(candidate.get("fileName", "")).lower() in target_names:
                identity = self._file_identity(candidate)
                if identity not in selected_ids:
                    selected.append(candidate)
                    selected_ids.add(identity)

        # Architecture answers need one representative chunk per file first.
        for candidate in ranked_candidates:
            if len(selected) >= top_k:
                break
            identity = self._file_identity(candidate)
            if identity not in selected_ids:
                selected.append(candidate)
                selected_ids.add(identity)

        return selected[:top_k], {
            "strategy": "architecture_file_diversity",
            "uniqueFiles": len({self._file_identity(c) for c in selected[:top_k]}),
            "targetFilesPrioritized": sorted(target_names),
        }

    def retrieve(
        self,
        project_id: str,
        query: str,
        vector_store,
        top_k: int = 6,
    ) -> Dict[str, Any]:
        """
        Execute multi-method retrieval, fuse candidates, rerank, and return structured evidence.
        """
        t0 = time.time()
        pid_str = str(project_id)

        # Ensure project index & cache are active
        vector_store._ensure_project_loaded(pid_str)
        dep_graph = dependency_manager.get_graph(pid_str)
        known_files = vector_store._project_files.get(pid_str, [])

        # Build dependency graph if not yet cached
        if not dep_graph.files and known_files:
            dep_graph.build_graph(known_files)

        # Build lexical BM25 index if not yet cached
        if not lexical_store.has_index(pid_str):
            memory_chunks = vector_store._memory_store.get(pid_str, [])
            if memory_chunks:
                lexical_store.index_project_chunks(pid_str, memory_chunks)

        # Step 1: Query Understanding
        qu_info = self._query_understanding(query, known_files, dep_graph)
        mentioned_files = qu_info["mentionedFiles"]
        architecture_query = self._is_architecture_query(query, qu_info)
        candidate_pool_k = min(30, max(15, top_k * 4))

        # Candidate pool: signature -> candidate_dict
        candidates: Dict[str, Dict[str, Any]] = {}

        def get_signature(file_name: str, file_path: str, file_id: str, start_line: int, end_line: int) -> str:
            identity = str(file_id or file_path or file_name).replace("\\", "/").lower()
            return f"{identity}:{start_line}-{end_line}"

        def get_or_create_candidate(chunk_id: str, file_name: str, file_path: str, start_line: int, end_line: int, symbol: str, symbol_type: str, content: str, file_id: str = "") -> Dict[str, Any]:
            sig = get_signature(file_name, file_path, file_id, start_line, end_line)
            if sig not in candidates:
                candidates[sig] = {
                    "signature": sig,
                    "chunkId": chunk_id,
                    "fileId": file_id,
                    "fileName": file_name,
                    "filePath": file_path,
                    "startLine": start_line,
                    "endLine": end_line,
                    "symbol": symbol,
                    "symbolType": symbol_type,
                    "content": content,
                    "semanticScore": 0.0,
                    "lexicalScore": 0.0,
                    "structuralScore": 0.0,
                    "filenameScore": 0.0,
                    "retrievalSources": set(),
                    "reasons": [],
                }
            elif file_id and not candidates[sig].get("fileId"):
                candidates[sig]["fileId"] = file_id
            return candidates[sig]

        # ------------------------------------------------------------------
        # Method A: Exact Filename / Path / Symbol Matching
        # ------------------------------------------------------------------
        exact_match_count = 0
        target_file_names = []
        for mf in mentioned_files:
            fname = mf.get("fileName") or mf.get("name")
            target_file_names.append(fname)
            # Find chunks for this target file
            tf_chunks = [
                c for c in vector_store._memory_store.get(pid_str, [])
                if os.path.basename(c.get("metadata", {}).get("fileName", "")).lower() == fname.lower()
            ]
            if not tf_chunks and mf.get("content"):
                from .chunker import chunker
                tf_chunks = chunker.chunk_file(mf)

            for c in tf_chunks:
                meta = c.get("metadata", {})
                f_id = str(meta.get("fileId") or mf.get("fileId") or mf.get("_id") or "")
                cand = get_or_create_candidate(
                    chunk_id=c.get("id", f"{fname}_chunk"),
                    file_name=meta.get("fileName", fname),
                    file_path=meta.get("filePath", f"/{fname}"),
                    start_line=meta.get("startLine", 1),
                    end_line=meta.get("endLine", 1),
                    symbol=meta.get("symbol", "module_scope"),
                    symbol_type=meta.get("symbolType", "module"),
                    content=c.get("text") or c.get("content", ""),
                    file_id=f_id,
                )
                cand["filenameScore"] = 1.0
                cand["retrievalSources"].add("exact_filename")
                cand["reasons"].append(f"Explicit filename query match: '{fname}'")
                exact_match_count += 1

        # ------------------------------------------------------------------
        # Method B: Lexical Keyword Retrieval (Okapi BM25)
        # ------------------------------------------------------------------
        lexical_results = lexical_store.search(pid_str, query, top_k=candidate_pool_k)
        lexical_count = len(lexical_results)

        for chunk_item, lex_score in lexical_results:
            meta = chunk_item.get("metadata", {})
            f_id = str(meta.get("fileId") or "")
            cand = get_or_create_candidate(
                chunk_id=chunk_item.get("id", "chunk"),
                file_name=meta.get("fileName", "unknown"),
                file_path=meta.get("filePath", "/unknown"),
                start_line=meta.get("startLine", 1),
                end_line=meta.get("endLine", 1),
                symbol=meta.get("symbol", ""),
                symbol_type=meta.get("symbolType", "block"),
                content=chunk_item.get("text") or chunk_item.get("content", ""),
                file_id=f_id,
            )
            cand["lexicalScore"] = max(cand["lexicalScore"], lex_score)
            cand["retrievalSources"].add("keyword")
            cand["reasons"].append(f"Lexical BM25 score: {lex_score:.2f}")

        # ------------------------------------------------------------------
        # Method C: Semantic Vector Retrieval (ChromaDB)
        # ------------------------------------------------------------------
        semantic_count = 0
        coll_name = vector_store._get_collection_name(pid_str)
        if vector_store.client is not None:
            try:
                coll = vector_store.client.get_collection(name=coll_name)
                total_docs = coll.count()
                if total_docs > 0:
                    q_emb = embedding_engine.embed_query(query)
                    k_num = min(candidate_pool_k, total_docs)
                    chroma_res = coll.query(
                        query_embeddings=[q_emb],
                        n_results=k_num,
                        include=["documents", "metadatas", "distances"]
                    )
                    if chroma_res and chroma_res.get("documents") and chroma_res["documents"][0]:
                        for i, doc in enumerate(chroma_res["documents"][0]):
                            meta = chroma_res["metadatas"][0][i] if chroma_res.get("metadatas") else {}
                            dist = chroma_res["distances"][0][i] if chroma_res.get("distances") else 0.5
                            # Cosine distance to similarity: max(0.0, 1.0 - dist)
                            cosine_sim = round(max(0.0, min(1.0, 1.0 - dist)), 4)
                            f_id = str(meta.get("fileId") or "")

                            cand = get_or_create_candidate(
                                chunk_id=meta.get("fileId", "chunk") + f"_sem_{i}",
                                file_name=meta.get("fileName", "unknown"),
                                file_path=meta.get("filePath", "/unknown"),
                                start_line=int(meta.get("startLine", 1)),
                                end_line=int(meta.get("endLine", 1)),
                                symbol=meta.get("symbol", ""),
                                symbol_type=meta.get("symbolType", "block"),
                                content=doc,
                                file_id=f_id,
                            )
                            cand["semanticScore"] = max(cand["semanticScore"], cosine_sim)
                            cand["retrievalSources"].add("semantic")
                            cand["reasons"].append(f"Semantic similarity: {cosine_sim:.2f}")
                            semantic_count += 1
            except Exception as e:
                print(f"[HybridRetriever] ChromaDB query warning: {e}")

        # ------------------------------------------------------------------
        # Method D: Code Structure & Dependency Graph Expansion
        # ------------------------------------------------------------------
        structural_count = 0
        seed_files = [c["fileName"] for c in candidates.values() if (c["filenameScore"] > 0 or c["semanticScore"] > 0.60 or c["lexicalScore"] > 0.60)]
        if architecture_query:
            seed_files.extend(mf.get("fileName") or mf.get("name") for mf in mentioned_files)
            seed_files = list(dict.fromkeys(filter(None, seed_files)))
        connected_files_map = dep_graph.expand_candidates(seed_files)

        for conn_file_key, struct_weight in connected_files_map.items():
            if conn_file_key not in dep_graph.files:
                continue
            conn_info = dep_graph.files[conn_file_key]
            conn_name = conn_info["fileName"]

            conn_chunks = [
                c for c in vector_store._memory_store.get(pid_str, [])
                if os.path.basename(c.get("metadata", {}).get("fileName", "")).lower() == conn_file_key
            ]
            if not conn_chunks and conn_info.get("content"):
                from .chunker import chunker
                conn_chunks = chunker.chunk_file(conn_info)

            for c in conn_chunks:
                meta = c.get("metadata", {})
                f_id = str(meta.get("fileId") or conn_info.get("fileId") or "")
                cand = get_or_create_candidate(
                    chunk_id=c.get("id", f"{conn_name}_dep"),
                    file_name=meta.get("fileName", conn_name),
                    file_path=meta.get("filePath", f"/{conn_name}"),
                    start_line=meta.get("startLine", 1),
                    end_line=meta.get("endLine", 1),
                    symbol=meta.get("symbol", ""),
                    symbol_type=meta.get("symbolType", "block"),
                    content=c.get("text") or c.get("content", ""),
                    file_id=f_id,
                )
                cand["structuralScore"] = max(cand["structuralScore"], struct_weight)
                cand["retrievalSources"].add("dependency")
                cand["reasons"].append(f"Connected in dependency graph (weight: {struct_weight:.2f})")
                structural_count += 1

        # ------------------------------------------------------------------
        # Candidate Fusion & Normalized Reranking
        # ------------------------------------------------------------------
        ranked_candidates = []
        for cand in candidates.values():
            final_score = (
                self.w_semantic * cand["semanticScore"]
                + self.w_lexical * cand["lexicalScore"]
                + self.w_structural * cand["structuralScore"]
                + self.w_filename * cand["filenameScore"]
            )
            cand["score"] = round(final_score, 4)
            cand["retrievalSources"] = sorted(list(cand["retrievalSources"]))
            # Clean human-readable composite reason
            source_labels = [s.replace("_", " ").title() for s in cand["retrievalSources"]]
            cand["reasonSummary"] = " + ".join(source_labels) if source_labels else "Keyword Match"
            ranked_candidates.append(cand)

        # Sort descending by final fused score
        ranked_candidates.sort(key=lambda x: x["score"], reverse=True)

        # Apply target file isolation filter: if explicit filename query was made,
        # suppress unrelated chunks with very low similarity to avoid cross-file hallucinations
        filtered_candidates = []
        if target_file_names:
            target_norm = [os.path.basename(tf).lower() for tf in target_file_names]
            for c in ranked_candidates:
                c_norm = os.path.basename(c["fileName"]).lower()
                if c_norm in target_norm or "dependency" in c["retrievalSources"] or c["score"] >= 0.55:
                    filtered_candidates.append(c)
        else:
            filtered_candidates = ranked_candidates

        # Rerank and select the final evidence set after channel fusion.
        final_chunks, selection_metadata = self._select_candidates(
            filtered_candidates,
            top_k,
            architecture_query,
            target_file_names,
        )
        for idx, chunk in enumerate(final_chunks, 1):
            chunk["rank"] = idx

        # Generate verified dependency reports for all target/seed files
        dependency_reports = []
        report_files = target_file_names if target_file_names else list(set([c["fileName"] for c in final_chunks[:3]]))
        for rf in report_files:
            report = dep_graph.get_file_report(rf)
            if report.get("found"):
                dependency_reports.append(report)

        latency_ms = round((time.time() - t0) * 1000, 2)
        project_structure = sorted(list(set([f.get("fileName") or f.get("name") for f in known_files if f.get("fileName") or f.get("name")])))

        if os.getenv("RAG_DEBUG", "true").lower() in ("true", "1"):
            print(f"[RAG RETRIEVAL]\nQuery: {query}\nIntent: {'architecture' if architecture_query else 'focused'}")
            print(f"Candidates: {len(candidates)} (pool target: {candidate_pool_k})")
            print("Selected context:")
            for chunk in final_chunks:
                print(f"  {chunk['rank']}. {chunk['fileName']} L{chunk['startLine']}-{chunk['endLine']} score={chunk['score']:.4f}")
            print(f"Why selected: {selection_metadata['strategy']}; unique files={selection_metadata['uniqueFiles']}")

        return {
            "chunks": final_chunks,
            "count": len(final_chunks),
            "targetFiles": target_file_names,
            "allDependencyReports": dependency_reports,
            "dependencyAnalysis": dependency_reports[0] if dependency_reports else None,
            "projectStructure": project_structure,
            "retrievalMetadata": {
                "topK": top_k,
                "candidatePoolSize": candidate_pool_k,
                "queryIntent": "architecture" if architecture_query else "focused",
                "retrievalTimeMs": latency_ms,
                "totalCandidates": len(candidates),
                "exactMatchesCount": exact_match_count,
                "lexicalCount": lexical_count,
                "semanticCount": semantic_count,
                "structuralCount": structural_count,
                "fusedScores": [c["score"] for c in final_chunks],
                "selectedFiles": [c["fileName"] for c in final_chunks],
                "selection": selection_metadata,
                "methodsUsed": ["exact_filename", "bm25_lexical", "chromadb_semantic", "dependency_graph"],
            }
        }


hybrid_retriever = HybridRetriever()
