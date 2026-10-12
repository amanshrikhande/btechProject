from typing import Any, Dict, List, Optional


class PromptBuilder:
    """Build compact, grounded prompts for the local Qwen coding model."""

    @staticmethod
    def build_developer_prompt(
        user_message: str,
        active_file_name: str,
        active_code: str,
        language: str,
        rag_snippets: Optional[List[Dict[str, Any]]] = None,
        ml_analysis: Optional[Dict[str, Any]] = None,
        last_error: Optional[str] = None,
    ) -> str:
        snippets = rag_snippets or []
        analysis = ml_analysis or {}
        evidence: List[str] = []

        for index, snippet in enumerate(snippets[:6], start=1):
            evidence.append(
                "EVIDENCE {index}\n"
                "fileId: {file_id}\n"
                "filePath: {file_path}\n"
                "language: {language}\n"
                "startLine: {start_line}\n"
                "endLine: {end_line}\n"
                "code:\n{code}".format(
                    index=index,
                    file_id=snippet.get("fileId", ""),
                    file_path=snippet.get("filePath", ""),
                    language=snippet.get("language", ""),
                    start_line=snippet.get("startLine", 1),
                    end_line=snippet.get("endLine", 1),
                    code=snippet.get("snippet") or snippet.get("text") or "",
                )
            )

        evidence_text = "\n\n".join(evidence) or "No saved project evidence was supplied."
        analysis_text = ""
        if analysis:
            analysis_text = (
                "\n\nSTATIC ANALYSIS (supporting evidence only)\n"
                f"classification: {analysis.get('classification', 'NO_ISSUE')}\n"
                f"confidence: {analysis.get('confidence', '')}\n"
                f"details: {analysis.get('details', '')}"
            )

        return f'''You are DevShare AI, a senior software engineer using the Qwen coding model.

Answer the developer's question using only the supplied project evidence. Do not invent
files, symbols, routes, models, imports, behavior, or citations. The active editor buffer
is unsaved context and must not be treated as repository evidence. If the evidence is
insufficient, return INSUFFICIENT_EVIDENCE instead of guessing.

Return ONLY one valid JSON object. Do not use Markdown fences or extra commentary.
Use exactly one of these schemas:
{{"status":"ANSWER","summary":"concise grounded answer","claims":[{{"text":"specific grounded claim","evidence":[{{"fileId":"exact id","filePath":"exact path","startLine":1,"endLine":1}}]}}]}}
{{"status":"INSUFFICIENT_EVIDENCE","summary":"The supplied project evidence does not contain enough information to answer this reliably.","claims":[]}}

Rules for ANSWER:
- Keep the summary concise and technically direct.
- Include at most 3 claims.
- Every repository-specific claim must cite supplied evidence.
- Use exact fileId, filePath, and line boundaries from the evidence.
- Treat static analysis and runtime errors as supporting context, not proof.

ACTIVE EDITOR BUFFER
file: {active_file_name}
language: {language}
```{language}
{active_code or ""}
```

PROJECT EVIDENCE
{evidence_text}
{analysis_text}

RUNTIME ERROR
{last_error or "None"}

DEVELOPER QUESTION
{user_message}
'''
