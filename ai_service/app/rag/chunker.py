from typing import List, Dict, Any

class CodeChunker:
    def __init__(self, chunk_size_lines: int = 25, overlap_lines: int = 5):
        self.chunk_size_lines = chunk_size_lines
        self.overlap_lines = overlap_lines

    def chunk_file(self, file_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split a file's content into line-aware chunks with rich metadata.
        """
        content = file_data.get("content", "")
        file_id = file_data.get("fileId", "")
        project_id = file_data.get("projectId", "")
        file_name = file_data.get("fileName", "untitled")
        file_path = file_data.get("filePath", f"/{file_name}")
        language = file_data.get("language", "text")

        if not content:
            return []

        lines = content.split("\n")
        total_lines = len(lines)
        chunks = []

        # If file is small, return as single chunk
        if total_lines <= self.chunk_size_lines:
            chunk_id = f"{file_id}_chunk_0"
            chunks.append({
                "id": chunk_id,
                "text": content,
                "metadata": {
                    "fileId": file_id,
                    "projectId": project_id,
                    "fileName": file_name,
                    "filePath": file_path,
                    "language": language,
                    "startLine": 1,
                    "endLine": total_lines,
                },
            })
            return chunks

        # Sliding window chunking
        start = 0
        chunk_idx = 0
        while start < total_lines:
            end = min(start + self.chunk_size_lines, total_lines)
            chunk_lines = lines[start:end]
            chunk_text = "\n".join(chunk_lines)
            chunk_id = f"{file_id}_chunk_{chunk_idx}"

            chunks.append({
                "id": chunk_id,
                "text": chunk_text,
                "metadata": {
                    "fileId": file_id,
                    "projectId": project_id,
                    "fileName": file_name,
                    "filePath": file_path,
                    "language": language,
                    "startLine": start + 1,
                    "endLine": end,
                },
            })

            chunk_idx += 1
            start += (self.chunk_size_lines - self.overlap_lines)

        return chunks

chunker = CodeChunker()
