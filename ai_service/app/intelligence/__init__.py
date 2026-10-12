"""
DevShare Code Intelligence Package
Provides generalized intent analysis, static & AST code hazard detection,
CodeBERT pattern integration, and structured findings generation.
"""
from .intent_analyzer import intent_analyzer, IntentType
from .code_analyzer import code_analyzer
from .evidence_validator import EvidenceValidator, build_canonical_evidence

__all__ = ["intent_analyzer", "IntentType", "code_analyzer", "EvidenceValidator", "build_canonical_evidence"]
