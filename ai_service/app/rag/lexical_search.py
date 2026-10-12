"""
DevShare Lexical / Keyword Search Engine (BM25)
Provides fast, deterministic keyword and symbol retrieval across source code.
No external dependencies — pure Python Okapi BM25 with code-aware tokenization.
"""
from __future__ import annotations

import re
import math
from collections import Counter, defaultdict
from typing import List, Dict, Any, Tuple, Optional


def tokenize_code(text: str) -> List[str]:
    """
    Code-aware tokenizer that breaks text into normalized search terms:
    - Splits on non-alphanumeric characters
    - Splits camelCase (e.g. validateCredentials -> validate, credentials)
    - Splits snake_case (e.g. compute_hash -> compute, hash)
    - Preserves exact identifiers and filenames
    """
    if not text:
        return []

    tokens = []
    # 1. Extract raw words/identifiers
    raw_words = re.findall(r'[a-zA-Z0-9_\.\-]+', text)

    for word in raw_words:
        low = word.lower()
        tokens.append(low)

        # Split camelCase: e.g. "validateCredentials" -> "validate", "credentials"
        camel_parts = re.findall(r'[A-Z]?[a-z0-9]+|[A-Z]+(?=[A-Z][a-z0-9]|\b)', word)
        if len(camel_parts) > 1:
            for part in camel_parts:
                part_low = part.lower()
                if len(part_low) > 1 and part_low != low:
                    tokens.append(part_low)

        # Split snake_case / dot / dash
        if "_" in low or "-" in low or "." in low:
            subparts = re.split(r'[_.\-]+', low)
            for sp in subparts:
                if len(sp) > 1 and sp != low:
                    tokens.append(sp)

    # Filter out single-character tokens and common programming stop tokens
    stop_words = {
        "and", "the", "for", "with", "this", "that", "from", "import", "def",
        "class", "return", "function", "const", "let", "var", "true", "false",
        "none", "null", "undefined", "in", "is", "of", "to", "as", "by"
    }

    filtered = [t for t in tokens if len(t) > 1 and t not in stop_words]
    return filtered


class BM25Index:
    """
    Okapi BM25 implementation for indexing and searching code chunks.
    k1 = 1.5 (term saturation parameter)
    b = 0.75 (length normalization parameter)
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: List[Dict[str, Any]] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freqs: Dict[str, int] = defaultdict(int)
        self.idf: Dict[str, float] = {}
        self.term_freqs: List[Counter] = []
        self.num_docs: int = 0

    def build_index(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Build or replace the index with the provided code chunks.
        Each chunk is expected to have 'id', 'text' or 'content', and 'metadata'.
        """
        self.documents = chunks
        self.num_docs = len(chunks)
        self.doc_lengths = []
        self.term_freqs = []
        self.doc_freqs = defaultdict(int)

        if self.num_docs == 0:
            self.avg_doc_len = 0.0
            self.idf = {}
            return

        total_length = 0
        for chunk in chunks:
            # Combine content, file name, path, and symbol for comprehensive matching
            meta = chunk.get("metadata", {})
            f_name = meta.get("fileName", "")
            f_path = meta.get("filePath", "")
            symbol = meta.get("symbol", "")
            text = chunk.get("text") or chunk.get("content", "")

            # Give extra weight to symbols and filenames in the lexical representation
            boosted_text = f"{f_name} {f_path} {symbol} {symbol} {text}"
            tokens = tokenize_code(boosted_text)

            t_len = len(tokens)
            self.doc_lengths.append(t_len)
            total_length += t_len

            tf = Counter(tokens)
            self.term_freqs.append(tf)

            for term in tf.keys():
                self.doc_freqs[term] += 1

        self.avg_doc_len = total_length / self.num_docs if self.num_docs > 0 else 0.0

        # Compute Robertson-Spärck Jones IDF for all terms
        self.idf = {}
        for term, freq in self.doc_freqs.items():
            # Standard smoothed BM25 IDF: ln(1 + (N - n + 0.5) / (n + 0.5))
            val = math.log(1.0 + (self.num_docs - freq + 0.5) / (freq + 0.5))
            self.idf[term] = max(0.01, val)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        """
        Score all documents against the query terms using Okapi BM25.
        Returns sorted list of (chunk, normalized_score) tuples where score in [0.0, 1.0].
        """
        if self.num_docs == 0:
            return []

        query_tokens = tokenize_code(query)
        if not query_tokens:
            return []

        scores = [0.0] * self.num_docs

        for token in query_tokens:
            if token not in self.idf:
                continue

            idf_val = self.idf[token]

            for doc_idx in range(self.num_docs):
                tf = self.term_freqs[doc_idx].get(token, 0)
                if tf == 0:
                    continue

                doc_len = self.doc_lengths[doc_idx]
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / (self.avg_doc_len or 1.0)))
                term_score = idf_val * ((tf * (self.k1 + 1.0)) / denom)
                scores[doc_idx] += term_score

        # Pair up chunks with positive scores
        scored_results = []
        for idx, sc in enumerate(scores):
            if sc > 0.0:
                scored_results.append((self.documents[idx], sc))

        if not scored_results:
            return []

        # Sort by raw BM25 score descending
        scored_results.sort(key=lambda x: x[1], reverse=True)

        # Normalize scores to [0.0, 1.0] relative to top score
        max_score = scored_results[0][1] if scored_results else 1.0
        normalized = []
        for doc, raw_sc in scored_results[:top_k]:
            norm_sc = round(min(1.0, raw_sc / max_score), 4)
            normalized.append((doc, norm_sc))

        return normalized


class ProjectLexicalStore:
    """
    Manages isolated BM25 indexes per project.
    """
    def __init__(self):
        self._indexes: Dict[str, BM25Index] = {}

    def index_project_chunks(self, project_id: str, chunks: List[Dict[str, Any]]) -> None:
        pid_str = str(project_id)
        index = BM25Index()
        index.build_index(chunks)
        self._indexes[pid_str] = index

    def search(self, project_id: str, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        pid_str = str(project_id)
        index = self._indexes.get(pid_str)
        if not index:
            return []
        return index.search(query, top_k=top_k)

    def has_index(self, project_id: str) -> bool:
        return str(project_id) in self._indexes


lexical_store = ProjectLexicalStore()
