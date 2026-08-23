import Editor from "@monaco-editor/react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";

export const MonacoEditorWrapper = () => {
  const { code, language, handleCodeChange } = useWorkspace();

  const handleEditorDidMount = (editor, monaco) => {
    // Custom theme styling
    monaco.editor.defineTheme("devshare-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "c084fc", fontStyle: "bold" },
        { token: "string", foreground: "38bdf8" },
        { token: "number", foreground: "f43f5e" },
        { token: "identifier", foreground: "e0e7ff" },
      ],
      colors: {
        "editor.background": "#0b0c16",
        "editor.foreground": "#e0e7ff",
        "editorCursor.foreground": "#38bdf8",
        "editor.lineHighlightBackground": "#161726",
        "editorLineNumber.foreground": "#4b5563",
        "editorLineNumber.activeForeground": "#38bdf8",
        "editor.selectionBackground": "#38bdf833",
        "editor.inactiveSelectionBackground": "#38bdf81a",
      },
    });

    monaco.editor.setTheme("devshare-dark");
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0c16] relative overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={code}
        onChange={handleCodeChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontLigatures: true,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          padding: { top: 12, bottom: 12 },
          lineNumbers: "on",
          renderLineHighlight: "all",
          tabSize: 2,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
};
