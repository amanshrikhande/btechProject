import React, { useState, useEffect } from "react";
import { aiAPI } from "../../api/ai.api.js";
import { Database, RefreshCw } from "lucide-react";

export const ProjectKnowledgeCard = ({ project }) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    if (!project?._id) return;
    setLoading(true);
    try {
      const res = await aiAPI.getIndexStatus(project._id);
      if (res?.data) {
        setStatusData(res.data);
      }
    } catch (e) {
      console.warn("[Project Knowledge Status Error]:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 10s so status updates after auto-reindex completes
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [project?._id]);

  const isReady = statusData?.status === "ready" || (statusData?.chunksCount > 0);
  const filesCount = statusData?.filesCount ?? 0;
  const chunksCount = statusData?.chunksCount ?? 0;
  const languages =
    statusData?.languages && statusData.languages.length > 0
      ? statusData.languages.join(", ")
      : statusData?.status === "offline"
        ? "Unavailable"
        : "Not detected";
  const collectionName =
    statusData?.collectionName ||
    `proj_${(project?._id || "").replace(/[^a-zA-Z0-9]/g, "_")}`;

  return (
    <div
      style={{
        borderRadius: 8,
        background: "#080914",
        border: "1px solid rgba(6,182,212,0.25)",
        padding: "10px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Database size={13} style={{ color: "var(--c-cyan)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)" }}>
            Vector Knowledge Base
          </span>
        </div>

        {isReady ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--c-green)",
              background: "rgba(16,185,129,0.12)",
              padding: "1px 6px",
              borderRadius: 4,
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--c-green)",
                boxShadow: "0 0 6px var(--c-green)",
              }}
            />
            Indexed
          </span>
        ) : (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--c-amber)",
              background: "rgba(245,158,11,0.12)",
              padding: "1px 6px",
              borderRadius: 4,
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--c-amber)",
              }}
            />
            {loading ? "Checking..." : "Not Indexed"}
          </span>
        )}
      </div>

      {/* Details 2x2 Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          padding: "8px 10px",
          borderRadius: 6,
          background: "#101222",
          border: "1px solid var(--c-border)",
          fontFamily: "monospace",
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        <div>
          <span style={{ color: "var(--c-text-3)" }}>Files: </span>
          <span style={{ color: "var(--c-text)", fontWeight: 700 }}>{filesCount}</span>
        </div>
        <div>
          <span style={{ color: "var(--c-text-3)" }}>Chunks: </span>
          <span style={{ color: "var(--c-cyan)", fontWeight: 700 }}>{chunksCount}</span>
        </div>
        <div style={{ gridColumn: "span 2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--c-text-3)" }}>Languages: </span>
          <span style={{ color: "var(--c-text-2)" }}>{languages}</span>
        </div>
        <div style={{ gridColumn: "span 2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 }}>
          <span style={{ color: "var(--c-text-3)" }}>Collection: </span>
          <span style={{ color: "var(--c-purple)" }}>{collectionName}</span>
        </div>
      </div>

      {/* Footer — auto-index notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 6,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--c-text-3)" }}>
          {isReady ? "● Multi-File Grounding Active" : "○ Context Inactive"}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--c-text-3)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <RefreshCw size={10} style={{ color: "var(--c-cyan)" }} />
          Auto-indexed
        </span>
      </div>
    </div>
  );
};
