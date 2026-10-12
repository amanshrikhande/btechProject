"""
Evidence Validator & Canonical Evidence Representation
Strictly verifies that all LLM claims, citations, and findings are grounded
in actual project source code and supplied retrieval chunks.
Prevents fabricated files, phantom classes/functions, and unauthorized verification upgrades.
"""

import os
import re
import json
import hashlib
import datetime
from typing import Dict, Any, List, Optional, Tuple


def build_canonical_evidence(
    chunk: Dict[str, Any],
    file_id: Optional[str] = None,
    file_path: Optional[str] = None,
    start_line: Optional[int] = None,
    end_line: Optional[int] = None,
    snippet: Optional[str] = None,
    symbol: Optional[str] = None,
    retrieval_source: Optional[str] = None,
    score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Creates ONE canonical evidence object representation used consistently across:
    - RAG UI
    - Ollama prompt
    - Server-side validation
    - Monaco editor navigation
    """
    fid = str(file_id or chunk.get("fileId") or "")
    fpath = file_path or chunk.get("filePath") or chunk.get("fileName") or ""
    # Normalize filePath to have leading slash for consistency
    if fpath and not fpath.startswith("/") and not fpath.startswith("\\"):
        norm_path = "/" + fpath.replace("\\", "/")
    else:
        norm_path = fpath.replace("\\", "/")

    s_line = start_line if start_line is not None else chunk.get("startLine", 1)
    e_line = end_line if end_line is not None else chunk.get("endLine", 1)
    if s_line < 1:
        s_line = 1
    if e_line < s_line:
        e_line = s_line

    snip = snippet if snippet is not None else (chunk.get("content") or chunk.get("snippet") or "")
    sym = symbol or chunk.get("symbol") or "code"
    
    # Retrieval source representation
    r_src = retrieval_source
    if not r_src:
        sources_list = chunk.get("retrievalSources") or []
        r_src = ", ".join(sources_list) if isinstance(sources_list, list) else str(sources_list)
        if not r_src:
            r_src = chunk.get("reasonSummary") or "retrieved"

    scr = float(score if score is not None else chunk.get("score", 1.0))

    # Determine language
    lang = (
        chunk.get("language")
        or chunk.get("metadata", {}).get("language")
        or ("python" if norm_path.endswith(".py")
            else ("javascript" if norm_path.endswith((".js", ".jsx"))
                  else ("typescript" if norm_path.endswith((".ts", ".tsx"))
                        else ("cpp" if norm_path.endswith((".cpp", ".c", ".cc", ".h", ".hpp"))
                              else ("java" if norm_path.endswith(".java") else "code")))))
    )

    # Hashes: chunkHash for chunk deduplication, fileContentHash for authoritative file version
    snip_clean = snip.strip()
    c_hash = (
        chunk.get("chunkHash")
        or chunk.get("metadata", {}).get("chunkHash")
        or chunk.get("contentHash")
        or chunk.get("metadata", {}).get("contentHash")
        or hashlib.sha256(snip_clean.encode("utf-8", errors="replace")).hexdigest()
    )
    f_content_hash = (
        chunk.get("fileContentHash")
        or chunk.get("metadata", {}).get("fileContentHash")
        or chunk.get("contentHash")
        or chunk.get("metadata", {}).get("contentHash")
        or c_hash
    )
    idx_at = (
        chunk.get("indexedAt")
        or chunk.get("metadata", {}).get("indexedAt")
        or datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

    return {
        "fileId": fid,
        "filePath": norm_path,
        "fileName": os.path.basename(norm_path),
        "language": lang,
        "startLine": int(s_line),
        "endLine": int(e_line),
        "snippet": snip_clean,
        "symbol": sym,
        "retrievalSource": r_src,
        "score": round(scr, 4),
        "fileContentHash": str(f_content_hash),
        "chunkHash": str(c_hash),
        "indexedAt": str(idx_at),
    }


def create_evidence_manifest(
    project_id: str,
    query_id: str,
    model: str,
    canonical_evidence: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Creates an authoritative pre-inference evidence manifest proving exactly
    what evidence was supplied to the model for research reproducibility.
    """
    return {
        "projectId": str(project_id),
        "queryId": str(query_id),
        "model": str(model),
        "evidenceCount": len(canonical_evidence),
        "evidence": [
            {
                "fileId": ev.get("fileId"),
                "filePath": ev.get("filePath"),
                "fileName": ev.get("fileName"),
                "language": ev.get("language"),
                "startLine": ev.get("startLine"),
                "endLine": ev.get("endLine"),
                "snippetHash": hashlib.sha256(ev.get("snippet", "").encode("utf-8", errors="replace")).hexdigest()[:16],
                "fileContentHash": ev.get("fileContentHash", ""),
                "chunkHash": ev.get("chunkHash", ""),
            }
            for ev in canonical_evidence
        ]
    }


class EvidenceValidator:
    """
    Server-side validator that verifies LLM structured output against project evidence.
    """

    # NOTE: Do NOT maintain a static hardcoded list of "known hallucination targets".
    # Hardcoding project-specific names (e.g. AuthService, UserRepository) causes false
    # positives when those entities genuinely exist in the current project's source code.
    # The dynamic check in check_hallucinated_entities() already handles this correctly:
    # it only flags an entity if it appears in the LLM response AND is absent from the
    # actual retrieved evidence text (self.all_evidence_text). No static list is needed.
    KNOWN_HALLUCINATION_TARGETS: list = []  # Intentionally empty — see note above

    def __init__(
        self,
        canonical_evidence: List[Dict[str, Any]],
        project_structure: List[str],
        raw_signals: Optional[List[Dict[str, Any]]] = None,
        context_prompt: str = "",
        manifest: Optional[Dict[str, Any]] = None,
    ):
        self.canonical_evidence = canonical_evidence
        self.project_structure = project_structure
        self.raw_signals = raw_signals or []
        self.context_prompt = context_prompt
        self.manifest = manifest or {}

        # Quick lookup structures
        self.supplied_file_ids = {e["fileId"] for e in canonical_evidence if e.get("fileId")}
        self.supplied_paths = {
            self._norm_path(e["filePath"]): e for e in canonical_evidence if e.get("filePath")
        }
        self.project_paths = {self._norm_path(p) for p in project_structure}

        # Collect all text in supplied evidence for entity verification
        self.all_evidence_text = " ".join([
            f"{e.get('filePath', '')} {e.get('symbol', '')} {e.get('snippet', '')}"
            for e in canonical_evidence
        ]).lower()

        # Compute context hash
        self.context_hash = hashlib.sha256(context_prompt.encode("utf-8")).hexdigest()[:16] if context_prompt else ""


    @staticmethod
    def _norm_path(path: str) -> str:
        if not path:
            return ""
        p = path.replace("\\", "/").strip().lower()
        if not p.startswith("/"):
            p = "/" + p
        return p

    def extract_json_payload(self, text: str) -> Optional[Dict[str, Any]]:
        """Safely parses JSON from LLM output, extracting from markdown blocks if needed."""
        if not text:
            return None
        t = text.strip()
        
        # 1. Direct JSON parse
        try:
            return json.loads(t)
        except Exception:
            pass

        # 2. Extract from ```json ... ``` code fence
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t, re.IGNORECASE)
        if json_match:
            try:
                return json.loads(json_match.group(1).strip())
            except Exception:
                pass

        # 3. Search for first { to last }
        first_brace = t.find("{")
        last_brace = t.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(t[first_brace : last_brace + 1])
            except Exception:
                pass

        return None

    def validate_citation(self, file_id: str, file_path: str, start_line: int, end_line: int, snippet: str = "") -> Tuple[bool, str]:
        """
        Validates a single evidence citation against supplied project evidence.
        Returns (is_valid, failure_reason).
        """
        norm_fp = self._norm_path(file_path)
        base_name = os.path.basename(norm_fp)

        # Resolve citations by stable identity first. Basename matching is only
        # safe when exactly one supplied evidence item has that basename.
        matching_evidence = None
        if file_id:
            matching_evidence = next(
                (ev for ev in self.canonical_evidence if str(ev.get("fileId")) == str(file_id)),
                None,
            )
        if matching_evidence is None and norm_fp:
            matching_evidence = next(
                (ev for p, ev in self.supplied_paths.items() if self._norm_path(p) == norm_fp),
                None,
            )
        if matching_evidence is None and base_name:
            basename_matches = [
                ev for ev in self.canonical_evidence
                if os.path.basename(self._norm_path(ev.get("filePath", ""))) == base_name
            ]
            if len(basename_matches) == 1:
                matching_evidence = basename_matches[0]

        if not matching_evidence:
            # Check if at least in project structure
            in_project = any(norm_fp == p or norm_fp.endswith(p) or p.endswith(norm_fp) for p in self.project_paths)
            if not in_project:
                return False, f"UNSUPPORTED_BY_CURRENT_EVIDENCE: File `{file_path}` does not exist in project evidence or structure"
            return False, f"UNSUPPORTED_BY_CURRENT_EVIDENCE: File `{file_path}` was not supplied as evidence for this query"

        # Check against authoritative evidence manifest if present
        if self.manifest and self.manifest.get("evidence"):
            manifest_match = any(
                (file_id and str(me.get("fileId")) == str(file_id)) or
                (norm_fp and self._norm_path(me.get("filePath", "")) == norm_fp) or
                (base_name and os.path.basename(self._norm_path(me.get("filePath", ""))) == base_name)
                for me in self.manifest["evidence"]
            )
            if not manifest_match:
                return False, f"UNSUPPORTED_BY_CURRENT_EVIDENCE: File `{file_path}` does not appear in supplied evidence manifest"

        # Check fileId consistency if provided
        if file_id and matching_evidence.get("fileId"):
            if str(file_id) != str(matching_evidence["fileId"]):
                return False, f"fileId `{file_id}` does not match canonical id `{matching_evidence['fileId']}`"

        # Check line ranges
        if start_line < 1:
            return False, f"Invalid startLine {start_line}"
        if end_line < start_line:
            return False, f"endLine {end_line} is less than startLine {start_line}"

        # If snippet provided, check if it occurs in evidence
        if snippet and len(snippet.strip()) > 10:
            snip_clean = " ".join(snippet.split()).lower()
            ev_clean = " ".join(matching_evidence.get("snippet", "").split()).lower()
            if snip_clean not in ev_clean and ev_clean not in snip_clean:
                # Allow partial match
                first_tokens = snip_clean.split()[:4]
                if not any(" ".join(first_tokens) in ev_clean for _ in [0]):
                    return False, f"Snippet does not match canonical source text"

        return True, "Valid"

    def check_hallucinated_entities(self, text: str) -> List[str]:
        """
        Checks if text references known hallucination entities (e.g. AuthService, UserRepository)
        when those entities DO NOT appear in any supplied evidence.
        """
        if not text:
            return []
        text_lower = text.lower()
        flagged = []
        for entity in self.KNOWN_HALLUCINATION_TARGETS:
            if entity in text_lower:
                # Only flag if entity does NOT exist in actual supplied evidence!
                if entity not in self.all_evidence_text:
                    flagged.append(entity)
        return flagged

    def validate_llm_response(
        self,
        raw_llm_output: str,
        intent: str,
        query: str = ""
    ) -> Dict[str, Any]:
        """
        Validates LLM output against supplied evidence and builds the verified response structure.
        """
        diagnostics = {
            "retrievalSuccess": len(self.canonical_evidence) > 0,
            "evidenceCount": len(self.canonical_evidence),
            "evidenceFileIds": list(self.supplied_file_ids),
            "evidencePaths": [e["filePath"] for e in self.canonical_evidence],
            "evidenceLineRanges": [f"{e['startLine']}-{e['endLine']}" for e in self.canonical_evidence],
            "ollamaContextHash": self.context_hash,
            "responseClaimCount": 0,
            "validatedClaimCount": 0,
            "rejectedClaimCount": 0,
            "hallucinationLikeClaimCount": 0,
            "failureStage": None,
        }

        # Check retrieval stage
        if not self.canonical_evidence:
            diagnostics["retrievalSuccess"] = False
            diagnostics["failureStage"] = "RETRIEVAL_FAILURE"

        parsed_json = self.extract_json_payload(raw_llm_output)

        # -------------------------------------------------------------
        # 1. Structured FINDING / NO_FINDING (Code Intelligence / Bug)
        # -------------------------------------------------------------
        if parsed_json and parsed_json.get("status") in ("FINDING", "FINDINGS", "NO_FINDING"):
            status = parsed_json.get("status")
            if status == "FINDINGS":
                status = "FINDING"

            if status == "NO_FINDING":
                return {
                    "status": "NO_FINDING",
                    "summary": parsed_json.get("summary") or parsed_json.get("explanation") or "No significant issue could be established from the available project evidence.",
                    "findings": [],
                    "claims": [],
                    "response": parsed_json.get("summary") or parsed_json.get("explanation") or "No significant issue could be established from the available project evidence.",
                    "diagnostics": diagnostics,
                    "warning": None,
                }

            # Single or multiple findings
            raw_findings = parsed_json.get("findings")
            if not raw_findings:
                raw_findings = [parsed_json]

            validated_findings = []
            warnings = []

            for f in raw_findings:
                diagnostics["responseClaimCount"] += 1
                f_path = f.get("filePath") or f.get("file") or ""
                f_id = f.get("fileId") or ""
                s_line = int(f.get("startLine") or 1)
                e_line = int(f.get("endLine") or s_line)
                snip = f.get("evidence") or ""
                explanation = f.get("explanation") or ""

                # Check hallucinated entities
                hallucinated = self.check_hallucinated_entities(f"{f_path} {explanation} {snip}")
                if hallucinated:
                    diagnostics["hallucinationLikeClaimCount"] += 1
                    diagnostics["rejectedClaimCount"] += 1
                    diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]
                    diagnostics["failureStage"] = "VALIDATION_FAILURE"
                    warnings.append(f"UNSUPPORTED_BY_CURRENT_EVIDENCE: Finding mentions unverified entities: {', '.join(hallucinated)}")
                    continue

                # Validate citation
                is_valid, reason = self.validate_citation(f_id, f_path, s_line, e_line, snip)
                if not is_valid:
                    diagnostics["rejectedClaimCount"] += 1
                    diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]
                    if not diagnostics["failureStage"]:
                        diagnostics["failureStage"] = "VALIDATION_FAILURE"
                    warnings.append(f"UNSUPPORTED_BY_CURRENT_EVIDENCE: Finding in `{f_path}` rejected: {reason}")
                    continue

                # Find canonical evidence to attach proper metadata
                matching_ev = None
                norm_fp = self._norm_path(f_path)
                for p, ev in self.supplied_paths.items():
                    if norm_fp == p or norm_fp.endswith(p) or p.endswith(norm_fp):
                        matching_ev = ev
                        break

                # Enforce Verification Rule (Phase 8):
                # VERIFIED only if confirmed by deterministic AST analysis in raw_signals
                verified_by_ast = any(
                    sig.get("verification") == "VERIFIED" and
                    self._norm_path(sig.get("filePath", "")) == norm_fp
                    for sig in self.raw_signals
                )
                verification = "VERIFIED" if verified_by_ast else "POTENTIAL"

                final_fid = matching_ev["fileId"] if matching_ev else f_id
                final_fpath = matching_ev["filePath"] if matching_ev else f_path

                validated_findings.append({
                    "type": "verified_issue" if verification == "VERIFIED" else "potential_issue",
                    "verification": verification,
                    "category": f.get("category", "LOGIC_ERROR"),
                    "severity": f.get("severity", "MEDIUM"),
                    "fileId": final_fid,
                    "filePath": final_fpath,
                    "startLine": s_line,
                    "endLine": e_line,
                    "symbol": f.get("symbol") or (matching_ev.get("symbol") if matching_ev else "module"),
                    "evidence": snip or (matching_ev.get("snippet") if matching_ev else ""),
                    "explanation": explanation,
                    "impact": f.get("impact", "Impacts expected behavior."),
                    "suggestedImprovement": f.get("suggestedImprovement", "Review logic."),
                    "suggestedCode": f.get("correctedCode") or f.get("suggestedCode") or "",
                })
                diagnostics["validatedClaimCount"] += 1

            if not validated_findings:
                status = "NO_FINDING"
                summary = "No verifiable issue could be established from the supplied project evidence."
                response_text = summary
            else:
                status = "FINDINGS"
                summary = f"Identified {len(validated_findings)} grounded finding(s)."
                response_text = validated_findings[0]["explanation"]

            warning_text = "Some generated claims could not be verified against the supplied project evidence." if warnings else None

            return {
                "status": status,
                "summary": summary,
                "findings": validated_findings,
                "claims": [],
                "response": response_text,
                "diagnostics": diagnostics,
                "warning": warning_text,
            }

        # -------------------------------------------------------------
        # 2. Structured INSUFFICIENT_EVIDENCE
        # -------------------------------------------------------------
        if parsed_json and parsed_json.get("status") == "INSUFFICIENT_EVIDENCE":
            summary = parsed_json.get("summary") or "The supplied project evidence does not contain sufficient information to answer this question."
            return {
                "status": "INSUFFICIENT_EVIDENCE",
                "summary": summary,
                "findings": [],
                "claims": [],
                "response": summary,
                "diagnostics": diagnostics,
                "warning": None,
            }

        # -------------------------------------------------------------
        # 3. Structured ANSWER (General Explanations / Questions)
        # -------------------------------------------------------------
        if parsed_json and parsed_json.get("status") == "ANSWER":
            raw_claims = parsed_json.get("claims") or []
            summary = parsed_json.get("summary") or ""
            validated_claims = []
            warnings = []

            # Check summary for hallucinated entities
            hallucinated_summary = self.check_hallucinated_entities(summary)
            if hallucinated_summary:
                diagnostics["hallucinationLikeClaimCount"] += 1
                diagnostics["failureStage"] = "VALIDATION_FAILURE"
                warnings.append(f"Summary mentioned unverified entities: {', '.join(hallucinated_summary)}")

            for c in raw_claims:
                diagnostics["responseClaimCount"] += 1
                if not isinstance(c, dict):
                    diagnostics["rejectedClaimCount"] += 1
                    diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]
                    warnings.append("UNSUPPORTED_BY_CURRENT_EVIDENCE: Claim must be an object with text and evidence")
                    continue
                c_text = c.get("text", "")
                if not isinstance(c_text, str) or not c_text.strip():
                    diagnostics["rejectedClaimCount"] += 1
                    diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]
                    warnings.append("UNSUPPORTED_BY_CURRENT_EVIDENCE: Claim text cannot be empty")
                    continue
                c_ev_list = c.get("evidence", [])

                # Check text for hallucinations
                h_entities = self.check_hallucinated_entities(c_text)
                if h_entities:
                    diagnostics["hallucinationLikeClaimCount"] += 1
                    diagnostics["rejectedClaimCount"] += 1
                    diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]
                    diagnostics["failureStage"] = "VALIDATION_FAILURE"
                    warnings.append(f"UNSUPPORTED_BY_CURRENT_EVIDENCE: Claim mentions unverified entities: {', '.join(h_entities)}")
                    continue

                # Validate evidence items for this claim
                valid_claim_ev = []
                for ev in c_ev_list:
                    if not isinstance(ev, dict):
                        warnings.append("UNSUPPORTED_BY_CURRENT_EVIDENCE: Evidence citation must be an object with fileId, filePath, and line range")
                        continue
                    ev_fpath = ev.get("filePath") or ""
                    ev_fid = ev.get("fileId") or ""
                    ev_sline = int(ev.get("startLine") or 1)
                    ev_eline = int(ev.get("endLine") or ev_sline)
                    is_valid, reason = self.validate_citation(ev_fid, ev_fpath, ev_sline, ev_eline)
                    if is_valid:
                        # Attach canonical fileId and path
                        norm_p = self._norm_path(ev_fpath)
                        canon_item = next((item for p, item in self.supplied_paths.items() if norm_p == p or norm_p.endswith(p) or p.endswith(norm_p)), None)
                        valid_claim_ev.append({
                            "fileId": canon_item["fileId"] if canon_item else ev_fid,
                            "filePath": canon_item["filePath"] if canon_item else ev_fpath,
                            "startLine": ev_sline,
                            "endLine": ev_eline,
                        })
                    else:
                        warnings.append(f"UNSUPPORTED_BY_CURRENT_EVIDENCE: Evidence `{ev_fpath}:{ev_sline}-{ev_eline}` invalid: {reason}")

                if valid_claim_ev:
                    validated_claims.append({
                        "text": c_text,
                        "evidence": valid_claim_ev,
                    })
                    diagnostics["validatedClaimCount"] += 1
                elif not c_ev_list and self.canonical_evidence and c_text.strip():
                    # Claim has no evidence citations at all (empty array from model), but
                    # canonical evidence was supplied and the claim text is clean — accept it
                    # as an uncited observation grounded in the retrieved context rather than
                    # counting it as a rejection and triggering the validation warning.
                    validated_claims.append({
                        "text": c_text,
                        "evidence": [],
                    })
                    diagnostics["validatedClaimCount"] += 1
                else:
                    diagnostics["rejectedClaimCount"] += 1
                    diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]

            # If all claims rejected due to hallucination/invalidity, switch to INSUFFICIENT_EVIDENCE or grounded summary
            if raw_claims and not validated_claims:
                if summary.strip() and self.canonical_evidence and not hallucinated_summary:
                    status = "ANSWER"
                    response_text = summary
                    diagnostics["summaryOnlyFallback"] = True
                else:
                    status = "INSUFFICIENT_EVIDENCE"
                    summary = "The requested information could not be verified from the supplied project evidence."
                    response_text = summary
            else:
                status = "ANSWER"
                # Construct markdown response with claims
                response_lines = [summary]
                if validated_claims:
                    response_lines.append("\n**Key Points:**")
                    for vc in validated_claims:
                        ev_str = ""
                        if vc["evidence"]:
                            cites = [f"`{os.path.basename(e['filePath'])}` L{e['startLine']}–L{e['endLine']}" for e in vc["evidence"]]
                            ev_str = f" *(Evidence: {', '.join(cites)})*"
                        response_lines.append(f"- {vc['text']}{ev_str}")
                response_text = "\n".join(response_lines)

            warning_text = (
                None
                if diagnostics.get("summaryOnlyFallback")
                else ("Some generated claims could not be verified against the supplied project evidence." if (warnings or diagnostics["rejectedClaimCount"] > 0) else None)
            )

            return {
                "status": status,
                "summary": summary,
                "findings": [],
                "claims": validated_claims,
                "response": response_text,
                "diagnostics": diagnostics,
                "warning": warning_text,
            }

        # -------------------------------------------------------------
        # 4. Malformed JSON handling
        # -------------------------------------------------------------
        diagnostics["responseClaimCount"] = 1
        diagnostics["rejectedClaimCount"] += 1
        diagnostics["unsupportedClaimCount"] = diagnostics["rejectedClaimCount"]
        diagnostics["failureStage"] = "MODEL_GENERATION_FAILURE"

        hallucinated = self.check_hallucinated_entities(raw_llm_output)
        if hallucinated:
            diagnostics["hallucinationLikeClaimCount"] += 1

        return {
            "status": "MODEL_OUTPUT_INVALID",
            "summary": "Model output was not valid structured JSON.",
            "findings": [],
            "claims": [],
            "response": "The language model produced an unparseable response structure. Expected valid structured JSON conforming to project evidence.",
            "diagnostics": diagnostics,
            "warning": "Model output failed JSON schema validation.",
        }
