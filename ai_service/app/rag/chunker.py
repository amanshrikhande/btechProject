import re
import ast
import hashlib
import datetime
from typing import List, Dict, Any

class CodeChunker:
    """
    Code-aware chunker that divides source code into logical structural units
    (functions, classes, methods, modules) with precise line numbers and symbols.
    Gracefully falls back to line-based sliding-window chunking.
    """
    def __init__(self, chunk_size_lines: int = 30, overlap_lines: int = 6):
        self.chunk_size_lines = chunk_size_lines
        self.overlap_lines = overlap_lines

    @staticmethod
    def _trim_end(lines: List[str], start_1idx: int, end_1idx: int) -> int:
        """
        Walk backwards from end_1idx to find the last line that has actual code
        (non-empty, non-whitespace-only). Returns the adjusted endLine (1-indexed).
        Keeps at least start_1idx so we never go below the chunk start.
        """
        idx = end_1idx  # 1-indexed
        while idx > start_1idx:
            line = lines[idx - 1]  # convert to 0-indexed
            if line.strip():
                return idx
            idx -= 1
        return start_1idx

    @staticmethod
    def _trim_start(lines: List[str], start_1idx: int, end_1idx: int) -> int:
        """
        Walk forward from start_1idx to find the first line that has actual code.
        Used to skip blank/decorator lines right after a detected boundary.
        Returns the adjusted startLine (1-indexed), capped at end_1idx.
        """
        idx = start_1idx
        while idx < end_1idx:
            line = lines[idx - 1]  # convert to 0-indexed
            if line.strip():
                return idx
            idx += 1
        return start_1idx

    def chunk_file(self, file_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        content = file_data.get("content", "")
        file_id = file_data.get("fileId") or file_data.get("_id") or "file"
        project_id = file_data.get("projectId", "")
        file_name = file_data.get("fileName") or file_data.get("name", "untitled")
        file_path = file_data.get("filePath") or file_data.get("path", f"/{file_name}")
        language = (file_data.get("language") or "javascript").lower()

        if not content or not content.strip():
            return []

        lines = content.split("\n")
        total_lines = len(lines)

        # 1. Try language-specific structural chunking
        structural_chunks = []
        if language in ("python", "py"):
            structural_chunks = self._chunk_python(lines, content, file_id, project_id, file_name, file_path, language)
        elif language in ("javascript", "js", "jsx", "typescript", "ts", "tsx"):
            structural_chunks = self._chunk_javascript(lines, content, file_id, project_id, file_name, file_path, language)
        elif language in ("cpp", "c", "java"):
            structural_chunks = self._chunk_c_family(lines, content, file_id, project_id, file_name, file_path, language)

        raw_chunks = structural_chunks if (structural_chunks and len(structural_chunks) > 0) else self._chunk_sliding_window(lines, file_id, project_id, file_name, file_path, language)

        # Authoritative file content hash (SHA-256) for stale-index detection
        file_content_hash = hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()
        indexed_at = file_data.get("indexedAt") or datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Annotate every chunk with canonical provenance hashes
        for c in raw_chunks:
            chunk_text = c.get("text", "")
            chunk_hash = hashlib.sha256(chunk_text.encode("utf-8", errors="replace")).hexdigest()
            c["metadata"]["fileContentHash"] = file_content_hash
            c["metadata"]["chunkHash"] = chunk_hash
            c["metadata"]["indexedAt"] = indexed_at
            c["metadata"]["contentHash"] = chunk_hash

        return raw_chunks


    def _chunk_python(self, lines: List[str], content: str, file_id: str, project_id: str, file_name: str, file_path: str, language: str) -> List[Dict[str, Any]]:
        chunks = []
        try:
            tree = ast.parse(content)
            chunk_idx = 0
            covered_lines = set()

            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    start = node.lineno
                    end = getattr(node, "end_lineno", start + 20)
                    # Trim trailing blank lines to the actual last code line
                    end = self._trim_end(lines, start, end)
                    symbol_type = "class" if isinstance(node, ast.ClassDef) else "function"
                    symbol_name = node.name

                    chunk_lines = lines[start - 1 : end]
                    chunk_text = "\n".join(chunk_lines)

                    chunks.append({
                        "id": f"{file_id}_chunk_{chunk_idx}",
                        "text": chunk_text,
                        "metadata": {
                            "projectId": str(project_id),
                            "fileId": str(file_id),
                            "fileName": file_name,
                            "filePath": file_path,
                            "language": language,
                            "symbol": symbol_name,
                            "symbolType": symbol_type,
                            "startLine": start,
                            "endLine": end,
                            "chunkIndex": chunk_idx,
                        }
                    })
                    chunk_idx += 1
                    covered_lines.update(range(start, end + 1))

            # If significant header / remaining lines exist outside functions/classes, add them
            uncovered = [i for i in range(1, len(lines) + 1) if i not in covered_lines]
            if uncovered:
                # Group contiguous uncovered lines
                start_u = uncovered[0]
                prev_u = start_u
                for line_no in uncovered[1:]:
                    if line_no > prev_u + 1 or (line_no - start_u) >= self.chunk_size_lines:
                        seg_end = self._trim_end(lines, start_u, prev_u)
                        text_seg = "\n".join(lines[start_u - 1 : seg_end])
                        if text_seg.strip():
                            chunks.append({
                                "id": f"{file_id}_chunk_{chunk_idx}",
                                "text": text_seg,
                                "metadata": {
                                    "projectId": str(project_id),
                                    "fileId": str(file_id),
                                    "fileName": file_name,
                                    "filePath": file_path,
                                    "language": language,
                                    "symbol": "module_scope",
                                    "symbolType": "module",
                                    "startLine": start_u,
                                    "endLine": seg_end,
                                    "chunkIndex": chunk_idx,
                                }
                            })
                            chunk_idx += 1
                        start_u = line_no
                    prev_u = line_no

                final_end = self._trim_end(lines, start_u, prev_u)
                final_seg = "\n".join(lines[start_u - 1 : final_end])
                if final_seg.strip():
                    chunks.append({
                        "id": f"{file_id}_chunk_{chunk_idx}",
                        "text": final_seg,
                        "metadata": {
                            "projectId": str(project_id),
                            "fileId": str(file_id),
                            "fileName": file_name,
                            "filePath": file_path,
                            "language": language,
                            "symbol": "module_scope",
                            "symbolType": "module",
                            "startLine": start_u,
                            "endLine": final_end,
                            "chunkIndex": chunk_idx,
                        }
                    })
            return sorted(chunks, key=lambda c: c["metadata"]["startLine"])
        except Exception:
            return []

    def _chunk_javascript(self, lines: List[str], content: str, file_id: str, project_id: str, file_name: str, file_path: str, language: str) -> List[Dict[str, Any]]:
        chunks = []
        chunk_idx = 0
        total_lines = len(lines)

        # Regex for common JS/TS functions, classes, and router handlers
        pattern = re.compile(
            r'^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function\*?\s+([a-zA-Z0-9_$]+)|class\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>|(?:router|app)\.(?:get|post|put|delete|patch|use)\s*\(\s*["\']([^"\']+)["\'])'
        )

        found_boundaries = []
        for line_idx, line in enumerate(lines):
            match = pattern.search(line)
            if match:
                symbol = match.group(1) or match.group(2) or match.group(3) or match.group(4) or "anonymous"
                stype = "class" if match.group(2) else ("route" if match.group(4) else "function")
                found_boundaries.append((line_idx + 1, symbol, stype))

        if not found_boundaries:
            return []

        for i, (start_line, symbol, stype) in enumerate(found_boundaries):
            if i < len(found_boundaries) - 1:
                end_line = max(start_line, found_boundaries[i + 1][0] - 1)
            else:
                end_line = total_lines

            # Limit overly long single chunks
            if (end_line - start_line) > 80:
                end_line = min(start_line + 80, total_lines)

            # Trim trailing blank lines so endLine points to actual last code line
            end_line = self._trim_end(lines, start_line, end_line)

            chunk_text = "\n".join(lines[start_line - 1 : end_line])
            if chunk_text.strip():
                chunks.append({
                    "id": f"{file_id}_chunk_{chunk_idx}",
                    "text": chunk_text,
                    "metadata": {
                        "projectId": str(project_id),
                        "fileId": str(file_id),
                        "fileName": file_name,
                        "filePath": file_path,
                        "language": language,
                        "symbol": symbol,
                        "symbolType": stype,
                        "startLine": start_line,
                        "endLine": end_line,
                        "chunkIndex": chunk_idx,
                    }
                })
                chunk_idx += 1

        # Also capture preamble (imports / setup) if before first boundary
        if found_boundaries and found_boundaries[0][0] > 1:
            preamble_end = self._trim_end(lines, 1, found_boundaries[0][0] - 1)
            preamble_text = "\n".join(lines[0 : preamble_end])
            if preamble_text.strip():
                chunks.insert(0, {
                    "id": f"{file_id}_chunk_preamble",
                    "text": preamble_text,
                    "metadata": {
                        "projectId": str(project_id),
                        "fileId": str(file_id),
                        "fileName": file_name,
                        "filePath": file_path,
                        "language": language,
                        "symbol": "imports_preamble",
                        "symbolType": "module",
                        "startLine": 1,
                        "endLine": preamble_end,
                        "chunkIndex": 0,
                    }
                })

        return chunks

    def _chunk_c_family(self, lines: List[str], content: str, file_id: str, project_id: str, file_name: str, file_path: str, language: str) -> List[Dict[str, Any]]:
        # Regex for C / C++ / Java methods and classes
        chunks = []
        chunk_idx = 0
        total_lines = len(lines)
        pattern = re.compile(
            r'^\s*(?:(?:public|private|protected|static|inline|virtual)\s+)*(?:class|struct|interface)\s+([a-zA-Z0-9_$]+)|^\s*(?:[\w:*&<>]+\s+)+([a-zA-Z0-9_$]+)\s*\([^;]*\)\s*\{'
        )

        boundaries = []
        for line_idx, line in enumerate(lines):
            match = pattern.search(line)
            if match:
                symbol = match.group(1) or match.group(2) or "method"
                stype = "class" if match.group(1) else "function"
                boundaries.append((line_idx + 1, symbol, stype))

        if not boundaries:
            return []

        for i, (start_line, symbol, stype) in enumerate(boundaries):
            end_line = boundaries[i + 1][0] - 1 if i < len(boundaries) - 1 else total_lines
            if (end_line - start_line) > 80:
                end_line = min(start_line + 80, total_lines)

            # Trim trailing blank lines so endLine points to actual last code line
            end_line = self._trim_end(lines, start_line, end_line)

            chunk_text = "\n".join(lines[start_line - 1 : end_line])
            if chunk_text.strip():
                chunks.append({
                    "id": f"{file_id}_chunk_{chunk_idx}",
                    "text": chunk_text,
                    "metadata": {
                        "projectId": str(project_id),
                        "fileId": str(file_id),
                        "fileName": file_name,
                        "filePath": file_path,
                        "language": language,
                        "symbol": symbol,
                        "symbolType": stype,
                        "startLine": start_line,
                        "endLine": end_line,
                        "chunkIndex": chunk_idx,
                    }
                })
                chunk_idx += 1
        return chunks

    def _chunk_sliding_window(self, lines: List[str], file_id: str, project_id: str, file_name: str, file_path: str, language: str) -> List[Dict[str, Any]]:
        total_lines = len(lines)
        chunks = []

        if total_lines <= self.chunk_size_lines:
            return [{
                "id": f"{file_id}_chunk_0",
                "text": "\n".join(lines),
                "metadata": {
                    "projectId": str(project_id),
                    "fileId": str(file_id),
                    "fileName": file_name,
                    "filePath": file_path,
                    "language": language,
                    "symbol": "file_content",
                    "symbolType": "module",
                    "startLine": 1,
                    "endLine": total_lines,
                    "chunkIndex": 0,
                },
            }]

        start = 0
        chunk_idx = 0
        while start < total_lines:
            end = min(start + self.chunk_size_lines, total_lines)
            chunk_lines = lines[start:end]
            chunk_text = "\n".join(chunk_lines)

            if chunk_text.strip():
                chunks.append({
                    "id": f"{file_id}_chunk_{chunk_idx}",
                    "text": chunk_text,
                    "metadata": {
                        "projectId": str(project_id),
                        "fileId": str(file_id),
                        "fileName": file_name,
                        "filePath": file_path,
                        "language": language,
                        "symbol": f"block_{chunk_idx + 1}",
                        "symbolType": "block",
                        "startLine": start + 1,
                        "endLine": end,
                        "chunkIndex": chunk_idx,
                    },
                })
                chunk_idx += 1

            start += (self.chunk_size_lines - self.overlap_lines)

        return chunks

chunker = CodeChunker()
