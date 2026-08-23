import { useState } from "react";
import { Layers, ChevronDown, ChevronUp, FileCode } from "lucide-react";

export const RAGSnippetsViewer = ({ snippets }) => {
  const [expanded, setExpanded] = useState(false);

  if (!snippets || snippets.length === 0) return null;

  return (
    <div className="p-2.5 rounded-xl bg-[#141627] border border-cyan-500/20 text-xs">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>Project RAG Context ({snippets.length} snippets)</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
          {snippets.map((snip, index) => (
            <div
              key={index}
              className="p-2 rounded-lg bg-[#0b0c16] border border-white/5 font-mono text-[11px]"
            >
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="flex items-center gap-1 text-cyan-400 truncate">
                  <FileCode className="w-3 h-3" />
                  {snip.filePath || snip.metadata?.filePath || "file"}
                </span>
                <span className="text-[10px] text-gray-500">
                  L{snip.startLine || snip.metadata?.startLine || 1}-{snip.endLine || snip.metadata?.endLine || 10}
                </span>
              </div>
              <pre className="text-gray-300 text-[10px] whitespace-pre-wrap line-clamp-3">
                {snip.content || snip.text || ""}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
