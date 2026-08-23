from typing import List, Dict, Any, Optional

class PromptBuilder:
    @staticmethod
    def build_developer_prompt(
        user_message: str,
        active_file_name: str,
        active_code: str,
        language: str,
        rag_snippets: List[Dict[str, Any]] = None,
        ml_analysis: Dict[str, Any] = None,
        last_error: Optional[str] = None,
    ) -> str:
        """
        Synthesize complete prompt combining Code context, RAG snippets, CodeBERT prediction, and runtime errors.
        """
        system_instruction = (
            "You are DevShare AI, an expert software engineering assistant integrated directly into "
            "the user's collaborative IDE. Provide concise, clear, and actionable explanations with code diffs where relevant."
        )

        context_parts = [system_instruction, "\n--- ACTIVE WORKSPACE CONTEXT ---"]
        context_parts.append(f"Active File: `{active_file_name}` ({language})")

        if active_code:
            context_parts.append(f"``` {language}\n{active_code}\n```")

        # Include CodeBERT defect analysis if available
        if ml_analysis and ml_analysis.get("classification") != "NO_ISSUE":
            classification = ml_analysis.get("classification")
            confidence = ml_analysis.get("confidence", 0.0)
            details = ml_analysis.get("details", "")
            context_parts.append(
                f"\n[CodeBERT ML Defect Flag]: {classification} (Confidence: {int(confidence * 100)}%)\n"
                f"Defect Details: {details}"
            )

        # Include runtime/compiler errors if available
        if last_error:
            context_parts.append(f"\n[Recent Execution / Compiler Error]:\n```\n{last_error}\n```")

        # Include RAG project snippets
        if rag_snippets and len(rag_snippets) > 0:
            context_parts.append("\n--- RELEVANT PROJECT CONTEXT (Retrieved via Vector RAG) ---")
            for idx, snip in enumerate(rag_snippets, 1):
                fpath = snip.get("filePath", "project file")
                start = snip.get("startLine", 1)
                end = snip.get("endLine", 1)
                content = snip.get("content", "")
                context_parts.append(f"File: {fpath} (Lines {start}-{end}):\n```{language}\n{content}\n```")

        context_parts.append("\n--- USER REQUEST ---")
        context_parts.append(user_message)
        context_parts.append("\nProvide a direct, high-quality developer response:")

        return "\n\n".join(context_parts)

prompt_builder = PromptBuilder()
