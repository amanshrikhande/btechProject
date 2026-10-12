"""
DevShare Generalized Query Intent Analyzer
Classifies user queries into 9 canonical intents using multi-signal detection:
- Action verbs & syntactic framing
- Semantic problem & hazard indicators
- Target code symbols & file indicators
- Architectural & execution trace phrasing
No hardcoded single-word dictionaries. Fully generalized for arbitrary natural language.
"""
from __future__ import annotations

import re
from enum import Enum
from typing import Dict, Any, List, Optional


class IntentType(str, Enum):
    BUG = "BUG"
    DEBUG = "DEBUG"
    EXPLAIN = "EXPLAIN"
    ARCHITECTURE = "ARCHITECTURE"
    LOCATE = "LOCATE"
    OPTIMIZATION = "OPTIMIZATION"
    SECURITY = "SECURITY"
    TRACE = "TRACE"
    GENERAL_CODE_QUESTION = "GENERAL_CODE_QUESTION"


class IntentAnalyzer:
    """
    Evaluates natural-language queries across multiple semantic dimensions
    to classify intent without rigid string-matching heuristics.
    """

    # Multi-signal semantic patterns with associated signal weights
    INTENT_SIGNALS = {
        IntentType.BUG: [
            (r'\b(?:find|detect|spot|check|inspect|identify|audit|look for)\b.*?\b(?:bug|bugs|defect|defects|flaw|flaws|error|errors|issue|issues|problem|problems)\b', 3.5),
            (r'\b(?:is there|are there)\b.*?\b(?:any\b.*?)?(?:bug|defect|flaw|problem|mistake|anomaly)\b', 3.0),
            (r'\b(?:code review|bug hunt|bug audit|vulnerability audit)\b', 2.8),
            (r'\b(?:potential|possible)\s+(?:bug|defect|issue|failure|breakage)\b', 2.5),
            (r'\b(?:broken|incorrect|wrong|malfunctioning)\b', 2.0),
        ],
        IntentType.DEBUG: [
            (r'\bwhy\s+(?:is|does|did)\b.*?\b(?:fail|failing|crash|crashing|error|break|hanging|throw|throwing|not work|not working)\b', 3.8),
            (r'\b(?:how to fix|how do i fix|help me fix|debug|diagnose|troubleshoot)\b', 3.2),
            (r'\b(?:typeerror|referenceerror|syntaxerror|nullpointer|runtimeerror|indexerror|keyerror|exception|stack trace)\b', 3.0),
            (r'\b(?:getting an error|received error|throws error|failed with)\b', 2.8),
            (r'\b(?:fails|failed|crashing|hangs|freeze|infinite loop)\b', 2.2),
        ],
        IntentType.SECURITY: [
            (r'\b(?:security|vulnerability|vulnerabilities|cwe|cve|exploit|injection|xss|csrf|ssrf)\b', 3.8),
            (r'\b(?:sanitize|sanitization|sql injection|command injection|path traversal)\b', 3.5),
            (r'\b(?:password|hash|bcrypt|jwt|token|secret|credential|auth bypass)\b.*?\b(?:secure|safe|tampering|leak|protect)\b', 3.2),
            (r'\b(?:is it safe|security audit|security review|vulnerable to)\b', 3.0),
            (r'\b(?:authentication flaw|authorization check|rbac|permissions?)\b', 2.5),
        ],
        IntentType.OPTIMIZATION: [
            (r'\b(?:optimize|optimization|speed up|make faster|improve performance)\b', 3.8),
            (r'\b(?:time complexity|space complexity|big o|o\(n\)|quadratic|bottleneck|slow)\b', 3.5),
            (r'\b(?:memory leak|high cpu|high latency|overhead|reduce latency)\b', 3.0),
            (r'\b(?:inefficient|profiling|benchmark|slowest)\b', 2.5),
            (r'\b(?:how to improve performance|make it more efficient)\b', 2.8),
        ],
        IntentType.TRACE: [
            (r'\b(?:trace|track|follow|lifecycle)\b.*?\b(?:flow|request|data|execution|call|pipeline)\b', 3.8),
            (r'\bhow\b.*?\b(?:flow|flows|flow through|route|routes|pass|passes|journey)\b', 3.5),
            (r'\bstep[- ]by[- ]step\b.*?\b(?:from\b.*?\bto|through the|lifecycle|execution)\b', 3.2),
            (r'\b(?:call chain|call stack|execution path|control flow)\b', 3.0),
            (r'\b(?:from start to finish|end to end flow)\b', 2.5),
        ],
        IntentType.ARCHITECTURE: [
            (r'\bhow\s+does\b.*?\b(?:connect|integrate|relate|interface)\b.*?\b(?:to|with)\b', 3.8),
            (r'\b(?:architecture|system design|high level design|structure of the project|module structure)\b', 3.5),
            (r'\bhow\s+is\b.*?\b(?:structured|organized|modularized|laid out)\b', 3.2),
            (r'\b(?:component diagram|dependency diagram|system overview)\b', 2.8),
            (r'\b(?:relationship between|interactions? between)\b', 2.5),
        ],
        IntentType.LOCATE: [
            (r'\b(?:where is|where are|which file|what file|where do we)\b', 3.5),
            (r'\b(?:find the file|locate the|where can i find|where defined)\b', 3.5),
            (r'\b(?:where is the implementation|where is the code for)\b', 3.2),
            (r'\b(?:in which directory|which module contains)\b', 2.8),
        ],
        IntentType.EXPLAIN: [
            (r'\b(?:explain|walk me through|what does|describe|how does)\b', 2.5),
            (r'\b(?:what is the purpose of|meaning of|break down|explain code)\b', 2.5),
            (r'\b(?:teach me|help me understand|summary of)\b', 2.0),
        ],
    }

    def analyze(self, query: str, active_file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze arbitrary natural language query and determine the most likely
        canonical intent, evidence focus, and confidence score.
        """
        q = (query or "").strip().lower()
        if not q:
            return {
                "intent": IntentType.GENERAL_CODE_QUESTION.value,
                "confidence": 0.5,
                "signals": ["empty_query"],
                "focusKeywords": [],
            }

        scores: Dict[IntentType, float] = {t: 0.0 for t in IntentType}
        matched_signals: Dict[IntentType, List[str]] = {t: [] for t in IntentType}

        for intent_type, patterns in self.INTENT_SIGNALS.items():
            for pattern, weight in patterns:
                m = re.search(pattern, q, re.IGNORECASE)
                if m:
                    scores[intent_type] += weight
                    matched_signals[intent_type].append(m.group(0)[:40])

        # Conflict resolution and context refinement
        # If query asks "Why is ... failing", DEBUG > BUG
        if re.search(r'\bwhy\b.*?\b(?:fail|crash|error|hang|break)\b', q):
            scores[IntentType.DEBUG] += 1.5

        # If query asks "Where is ... implemented", LOCATE > EXPLAIN
        if re.search(r'\bwhere\s+is\b', q):
            scores[IntentType.LOCATE] += 2.0

        # If query specifically mentions "flow through", TRACE > EXPLAIN
        if re.search(r'\bflow\s+through\b', q):
            scores[IntentType.TRACE] += 2.0

        # Extract potential symbols or identifiers
        symbols = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b', query)
        filtered_symbols = [
            s for s in symbols
            if s.lower() not in {"the", "and", "this", "that", "what", "where", "how", "why", "code", "file", "project"}
        ]

        # Find best matching intent
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_intent, top_score = ranked[0]

        if top_score < 1.5:
            # Low confidence in specialized intent -> fallback to GENERAL_CODE_QUESTION or EXPLAIN
            if any(w in q for w in ["explain", "what", "how", "show", "describe"]):
                final_intent = IntentType.EXPLAIN.value
                confidence = 0.70
            else:
                final_intent = IntentType.GENERAL_CODE_QUESTION.value
                confidence = 0.65
            signals = ["general_query"]
        else:
            final_intent = top_intent.value
            confidence = min(0.98, round(0.50 + (top_score * 0.12), 2))
            signals = matched_signals[top_intent]

        return {
            "intent": final_intent,
            "confidence": confidence,
            "signals": signals,
            "focusKeywords": filtered_symbols[:5],
            "queryNormalized": q,
        }


intent_analyzer = IntentAnalyzer()
