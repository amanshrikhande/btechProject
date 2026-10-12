import React from "react";
import { AlertTriangle, RefreshCw, Trash2, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[DevShare React ErrorBoundary caught an error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#080a12",
          color: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "'Inter', system-ui, sans-serif"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            backgroundColor: "#0f1118",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(244, 63, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f43f5e"
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", margin: 0 }}>
                  Application Render Issue
                </h2>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  DevShare caught an unexpected UI error.
                </span>
              </div>
            </div>

            <div style={{
              backgroundColor: "#080a12",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "14px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "#f43f5e",
              marginBottom: "24px",
              overflowX: "auto"
            }}>
              {this.state.error?.toString() || "Unknown rendering exception"}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#0891b2",
                  color: "#fff",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                <RefreshCw size={14} />
                Reload Page
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontWeight: "500",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                <Trash2 size={14} />
                Clear Session & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
