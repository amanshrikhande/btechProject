import Editor from "@monaco-editor/react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { Lock, Hand, Check } from "lucide-react";
import { useState } from "react";

export const MonacoEditorWrapper = () => {
  const { code, language, handleCodeChange, setEditorInstance } = useWorkspace();
  const { canEdit, isLeader, leaderMode, requestEditPermission, permissionNotice } = useSocket();
  const [requested, setRequested] = useState(false);

  const isReadOnly = leaderMode && !canEdit && !isLeader;

  const handleEditorDidMount = (editor, monaco) => {
    if (setEditorInstance) {
      setEditorInstance(editor);
    }
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

  const handleRequestClick = () => {
    requestEditPermission();
    setRequested(true);
    setTimeout(() => setRequested(false), 4000);
  };

  return (
    <div className="flex-1 w-full h-full bg-[#0b0c16] relative overflow-hidden">
      {/* View-Only status badge when Leader Mode is active */}
      {isReadOnly && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 20,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            borderRadius: "99px",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center gap-1.5" style={{ color: "var(--c-rose)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            <Lock size={12} />
            <span>VIEW ONLY</span>
          </div>
          <button
            onClick={handleRequestClick}
            disabled={requested}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: "99px",
              background: requested ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
              color: requested ? "var(--c-emerald)" : "var(--c-text-2)",
              border: requested ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--c-border)",
              transition: "all 0.15s",
            }}
          >
            {requested ? <Check size={10} /> : <Hand size={10} />}
            <span>{requested ? "Requested" : "Request Edit"}</span>
          </button>
        </div>
      )}

      {/* Temporary permission notification toast */}
      {permissionNotice && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            padding: "8px 16px",
            borderRadius: 8,
            background: "var(--c-surface-2)",
            border: "1px solid var(--c-cyan)",
            color: "var(--c-text)",
            fontSize: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}
        >
          {permissionNotice}
        </div>
      )}

      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={code}
        onChange={handleCodeChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          readOnly: isReadOnly,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontLigatures: true,
          smoothScrolling: true,
          cursorBlinking: isReadOnly ? "solid" : "smooth",
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
