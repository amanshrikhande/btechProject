"""
Shared CodeBERT & Structural Defect Patterns
Used across CodeBERT classification, AST analysis, and CodeAnalyzer.
"""

ISSUE_PATTERNS = {
    "javascript": {
        "PERFORMANCE_ISSUE": [
            (r'\bfor\s*\(.*\)\s*\{[^}]*\.push\(', "Array mutation in tight loop — consider pre-allocating or using map/reduce."),
            (r'while\s*\(\s*true\s*\)', "Unbounded while(true) loop — verify deterministic termination criteria."),
            (r'document\.querySelector.*loop|for.*document\.query', "DOM query in loop causes layout thrashing — cache selector outside loop."),
            (r'JSON\.parse\s*\(\s*JSON\.stringify', "Inefficient deep clone pattern — use structuredClone() or shallow spread."),
        ],
        "SECURITY_ISSUE": [
            (r'\beval\s*\(', "CWE-95: Dangerous eval() execution — refactor to structured JSON parsing or safe mapping."),
            (r'innerHTML\s*=\s*[^`"\']*\+', "CWE-79: Potential XSS via unescaped innerHTML string concatenation."),
            (r'document\.write\(', "Deprecated document.write() — poses rendering and script injection vulnerabilities."),
            (r'new\s+Function\s*\(', "Dynamic constructor evaluation — exposes scope and arbitrary code execution vectors."),
        ],
        "RUNTIME_ERROR": [
            (r'(\w+)\s*\.\s*\w+\s*\((?![^()]*\?\.)', "Potential null/undefined dereference — use optional chaining `?.`."),
            (r'undefined\s*\.\s*\w+', "Direct member access on undefined."),
            (r'(?<!\w)NaN\b', "Unchecked NaN propagation in arithmetic calculations."),
        ],
        "LOGIC_ERROR": [
            (r'if\s*\([^)]*==[^=][^)]*\)', "Loose equality `==` enables dangerous implicit type coercions — enforce strict `===`."),
            (r'return\s*\n', "Automatic Semicolon Insertion (ASI) splits return statement from payload."),
            (r'catch\s*\([^)]*\)\s*\{\s*\}', "Silent catch block conceals fatal exception propagation."),
        ],
    },
    "python": {
        "PERFORMANCE_ISSUE": [
            (r'for.*in.*range.*len\(', "Unidiomatic indexing — use `enumerate()` or zip for direct sequence consumption."),
            (r'\+\s*=.*in\s+for', "Quadratic string concatenation O(N²) in loop — accumulate in list and use `''.join()`."),
            (r'import \*', "Wildcard import degrades namespace resolution speed and obfuscates symbol provenance."),
        ],
        "SECURITY_ISSUE": [
            (r'\beval\s*\(', "CWE-95: Untrusted code execution via eval() — use `ast.literal_eval()`."),
            (r'\bexec\s*\(', "Arbitrary Python execution via exec() — remove dynamic namespace injection."),
            (r'subprocess.*shell\s*=\s*True', "CWE-78: Shell injection risk with shell=True — pass command list with shell=False."),
            (r'pickle\.loads?\(', "CWE-502: Deserializing untrusted pickle streams allows remote code execution."),
        ],
        "RUNTIME_ERROR": [
            (r'except\s*:\s*$|except\s*Exception\s*:\s*$', "Overly broad exception catching captures system exit signals."),
            (r'open\([^)]*\)(?!\s*as)', "Resource leak: file descriptor opened without context manager `with open(...)`."),
            (r'\[\s*-1\s*\](?!\s*if)', "Unchecked negative indexing on empty sequence raises IndexError."),
        ],
        "LOGIC_ERROR": [
            (r'if\s+\w+\s*==\s*True|if\s+\w+\s*==\s*False', "Redundant boolean comparison — use `if x:` or `if not x:`."),
            (r'def\s+\w+\([^)]*\[\][^)]*\)', "Mutable default argument captures shared state across function invocations."),
            (r'is\s+\d+|is\s+["\']', "Identity comparison `is` on literals — use value equality `==`."),
        ],
    },
}
