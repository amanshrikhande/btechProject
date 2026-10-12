"""
DevShare Code Structure & Dependency Graph Engine
Extracts static dependencies, module relationships, and symbol definitions
across Python, JavaScript/TypeScript, C/C++, and Java.
Enables query expansion along import/dependency edges.
"""
from __future__ import annotations

import os
import re
import ast
from typing import List, Dict, Any, Set, Optional


class ProjectDependencyGraph:
    """
    Bidirectional static dependency graph for a single project.
    Tracks:
      - defined symbols per file
      - forward imports (what file A imports)
      - reverse imports (what files import file A)
      - symbol definitions (which file defines symbol S)
    """
    def __init__(self, project_id: str):
        self.project_id = str(project_id)
        self.files: Dict[str, Dict[str, Any]] = {}
        # file_key -> set of imported file_keys
        self.forward_edges: Dict[str, Set[str]] = {}
        # file_key -> set of importer file_keys
        self.backward_edges: Dict[str, Set[str]] = {}
        # symbol_name.lower() -> file_key
        self.symbol_to_file: Dict[str, str] = {}
        # file_key -> set of defined symbols
        self.file_to_symbols: Dict[str, Set[str]] = {}
        # file_key -> set of external packages
        self.external_packages: Dict[str, Set[str]] = {}

    def _normalize_name(self, filename_or_path: str) -> str:
        if not filename_or_path:
            return ""
        return os.path.basename(filename_or_path).lower()

    def _get_stem(self, name: str) -> str:
        norm = self._normalize_name(name)
        return os.path.splitext(norm)[0]

    def build_graph(self, files: List[Dict[str, Any]]) -> None:
        """
        Parse all files in the project and construct the bidirectional dependency graph.
        """
        self.files.clear()
        self.forward_edges.clear()
        self.backward_edges.clear()
        self.symbol_to_file.clear()
        self.file_to_symbols.clear()
        self.external_packages.clear()

        # Step 1: Register all project files
        stem_to_key: Dict[str, str] = {}
        for f in files:
            f_name = f.get("fileName") or f.get("name") or os.path.basename(f.get("filePath", ""))
            if not f_name:
                continue
            key = self._normalize_name(f_name)
            stem = self._get_stem(f_name)

            self.files[key] = {
                "fileId": str(f.get("fileId") or f.get("_id") or f.get("id") or ""),
                "fileName": f_name,
                "filePath": f.get("filePath") or f.get("path") or f"/{f_name}",
                "language": (f.get("language") or "").lower(),
                "content": f.get("content", ""),
                "fileContentHash": f.get("fileContentHash") or f.get("contentHash") or "",
            }
            self.forward_edges[key] = set()
            self.backward_edges[key] = set()
            self.file_to_symbols[key] = set()
            self.external_packages[key] = set()
            stem_to_key[stem] = key

        # Step 2: Extract definitions and imports for each file
        for key, info in self.files.items():
            content = info["content"]
            lang = info["language"]
            f_name = info["fileName"]

            symbols, raw_imports = self._extract_symbols_and_imports(content, lang, f_name)

            # Record symbols
            for sym in symbols:
                sym_clean = sym.strip()
                if len(sym_clean) > 1:
                    self.file_to_symbols[key].add(sym_clean)
                    self.symbol_to_file[sym_clean.lower()] = key

            # Resolve imports against known project files
            for imp in raw_imports:
                imp_norm = self._normalize_name(imp)
                imp_stem = self._get_stem(imp)

                target_key = None
                if imp_norm in self.files:
                    target_key = imp_norm
                elif imp_stem in stem_to_key:
                    target_key = stem_to_key[imp_stem]

                if target_key and target_key != key:
                    self.forward_edges[key].add(target_key)
                    self.backward_edges[target_key].add(key)
                else:
                    # External or standard package
                    self.external_packages[key].add(imp)

    def _extract_symbols_and_imports(self, content: str, language: str, file_name: str) -> Tuple[List[str], List[str]]:
        symbols = []
        raw_imports = []
        lang = language.lower()

        # Python
        if lang in ("python", "py") or file_name.endswith(".py"):
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        symbols.append(node.name)
                    elif isinstance(node, ast.ClassDef):
                        symbols.append(node.name)
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            raw_imports.append(alias.name.split(".")[0])
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            raw_imports.append(node.module.split(".")[0])
                        for alias in node.names:
                            symbols.append(alias.name)
            except Exception:
                # Regex fallbacks
                symbols.extend(re.findall(r'def\s+([a-zA-Z0-9_]+)\s*\(', content))
                symbols.extend(re.findall(r'class\s+([a-zA-Z0-9_]+)', content))
                imp_matches = re.findall(r'^(?:from\s+([a-zA-Z0-9_]+)|import\s+([a-zA-Z0-9_]+))', content, re.MULTILINE)
                for m1, m2 in imp_matches:
                    raw_imports.append(m1 or m2)

        # JavaScript / TypeScript
        elif lang in ("javascript", "js", "jsx", "typescript", "ts", "tsx") or file_name.endswith((".js", ".jsx", ".ts", ".tsx")):
            # Functions, arrow functions, classes
            symbols.extend(re.findall(r'(?:function|class)\s+([a-zA-Z0-9_$]+)', content))
            symbols.extend(re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>', content))
            symbols.extend(re.findall(r'export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_$]+)', content))

            # Imports: ES6 import and CommonJS require
            es_imports = re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', content)
            cjs_imports = re.findall(r'require\s*\(\s*[\'"]([^\'"]+)[\'"]', content)
            dynamic_imports = re.findall(r'import\s*\(\s*[\'"]([^\'"]+)[\'"]', content)
            for imp in es_imports + cjs_imports + dynamic_imports:
                base = os.path.basename(imp)
                for ext in (".js", ".jsx", ".ts", ".tsx"):
                    if base.endswith(ext):
                        base = base[:-len(ext)]
                raw_imports.append(base)

        # C / C++
        elif lang in ("c", "cpp", "h", "hpp") or file_name.endswith((".c", ".cpp", ".h", ".hpp")):
            symbols.extend(re.findall(r'(?:class|struct)\s+([a-zA-Z0-9_]+)', content))
            symbols.extend(re.findall(r'\b[a-zA-Z0-9_:]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{', content))
            includes = re.findall(r'#include\s+["<]([^">]+)[">]', content)
            for inc in includes:
                raw_imports.append(os.path.basename(inc))

        # Java
        elif lang in ("java",) or file_name.endswith(".java"):
            symbols.extend(re.findall(r'(?:class|interface|enum)\s+([a-zA-Z0-9_]+)', content))
            symbols.extend(re.findall(r'(?:public|private|protected)\s+[a-zA-Z0-9_<>,\[\]]+\s+([a-zA-Z0-9_]+)\s*\(', content))
            j_imports = re.findall(r'import\s+([a-zA-Z0-9_.]+);', content)
            for jm in j_imports:
                raw_imports.append(jm.split(".")[-1])

        return symbols, raw_imports

    def expand_candidates(self, seed_files: List[str], max_depth: int = 1) -> Dict[str, float]:
        """
        Given an initial list of candidate files, traverse forward and backward edges
        in the dependency graph to find structurally connected files.
        Returns a dict of file_key -> structural_relevance_score (e.g. 0.9 for direct import, 0.7 for reverse).
        """
        structural_candidates: Dict[str, float] = {}

        for seed in seed_files:
            seed_key = self._normalize_name(seed)
            if seed_key not in self.files:
                continue

            # Forward dependencies (what this seed imports) -> very high relevance
            for fwd in self.forward_edges.get(seed_key, set()):
                if fwd != seed_key:
                    structural_candidates[fwd] = max(structural_candidates.get(fwd, 0.0), 0.90)

            # Backward dependencies (what files import this seed) -> high relevance
            for bwd in self.backward_edges.get(seed_key, set()):
                if bwd != seed_key:
                    structural_candidates[bwd] = max(structural_candidates.get(bwd, 0.0), 0.80)

        return structural_candidates

    def find_file_by_symbol(self, symbol_name: str) -> Optional[str]:
        """
        Returns the file_key defining symbol_name, if found.
        """
        return self.symbol_to_file.get(symbol_name.lower())

    def get_file_report(self, filename_or_path: str) -> Dict[str, Any]:
        """
        Return verified dependency report for a target file.
        """
        key = self._normalize_name(filename_or_path)
        if key not in self.files:
            return {
                "targetFile": filename_or_path,
                "found": False,
                "internalImports": [],
                "externalImports": [],
                "importedBy": [],
                "symbols": [],
                "relationshipSummary": f"File '{filename_or_path}' is not present in the project index.",
            }

        file_info = self.files[key]
        internal_imps = sorted([self.files[f]["fileName"] for f in self.forward_edges.get(key, set()) if f in self.files])
        imported_by = sorted([self.files[f]["fileName"] for f in self.backward_edges.get(key, set()) if f in self.files])
        external_imps = sorted(list(self.external_packages.get(key, set())))
        symbols = sorted(list(self.file_to_symbols.get(key, set())))

        # Build clean natural summary
        parts = []
        if internal_imps:
            parts.append(f"Imports project file(s): {', '.join(internal_imps)}.")
        else:
            parts.append("Does NOT import any other files in this project (0 internal imports).")

        if imported_by:
            parts.append(f"Imported by project file(s): {', '.join(imported_by)}.")
        else:
            parts.append("Is NOT imported by any other project files.")

        if not internal_imps and not imported_by:
            parts.append(f"Status: '{file_info['fileName']}' is currently a standalone file with no module connection to other project files.")

        return {
            "targetFile": file_info["fileName"],
            "filePath": file_info["filePath"],
            "found": True,
            "internalImports": internal_imps,
            "externalImports": external_imps,
            "importedBy": imported_by,
            "symbols": symbols,
            "relationshipSummary": " ".join(parts),
        }


class DependencyGraphManager:
    """
    Manages ProjectDependencyGraph instances isolated per project.
    """
    def __init__(self):
        self._graphs: Dict[str, ProjectDependencyGraph] = {}

    def get_graph(self, project_id: str) -> ProjectDependencyGraph:
        pid_str = str(project_id)
        if pid_str not in self._graphs:
            self._graphs[pid_str] = ProjectDependencyGraph(pid_str)
        return self._graphs[pid_str]

    def build_project_graph(self, project_id: str, files: List[Dict[str, Any]]) -> ProjectDependencyGraph:
        pid_str = str(project_id)
        graph = ProjectDependencyGraph(pid_str)
        graph.build_graph(files)
        self._graphs[pid_str] = graph
        return graph


dependency_manager = DependencyGraphManager()
