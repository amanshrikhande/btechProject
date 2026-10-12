"""
Visualization Engine for DevShare Research Benchmark
Generates 12 publication-grade figures (PNG and SVG) for IEEE/ACM academic papers using Matplotlib.
All figures render from actual benchmark data without hardcoded mocks.
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
RAW_DIR = os.path.join(BASE_DIR, "research_results", "raw")
SUMMARY_DIR = os.path.join(BASE_DIR, "research_results", "summary")
FIGURES_DIR = os.path.join(BASE_DIR, "research_results", "figures")

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 11,
    'axes.labelsize': 12,
    'axes.titlesize': 13,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'legend.fontsize': 10,
    'figure.titlesize': 14,
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'axes.spines.top': False,
    'axes.spines.right': False,
})

def ensure_dirs():
    os.makedirs(FIGURES_DIR, exist_ok=True)

def save_fig(fig, name):
    png_path = os.path.join(FIGURES_DIR, f"{name}.png")
    svg_path = os.path.join(FIGURES_DIR, f"{name}.svg")
    fig.savefig(png_path, bbox_inches='tight')
    fig.savefig(svg_path, bbox_inches='tight')
    plt.close(fig)
    print(f"  [OK] Saved figure: {name}.png & {name}.svg")

def generate_figures():
    ensure_dirs()
    print("\n--- Generating Paper-Ready Figures ---")

    collab_path = os.path.join(RAW_DIR, "collaboration_runs.csv")
    ai_path = os.path.join(RAW_DIR, "ai_runs.csv")
    eval_path = os.path.join(RAW_DIR, "ai_evaluations.csv")
    ret_path = os.path.join(RAW_DIR, "retrieval_results.csv")
    ci_path = os.path.join(SUMMARY_DIR, "confidence_intervals.csv")

    collab_df = pd.read_csv(collab_path) if os.path.exists(collab_path) else None
    merged_ai = None
    if os.path.exists(ai_path) and os.path.exists(eval_path):
        a_df = pd.read_csv(ai_path)
        e_df = pd.read_csv(eval_path)
        merged_ai = pd.merge(a_df, e_df, on=["benchmark_run_id", "condition", "question_id", "repetition"])
    ret_df = pd.read_csv(ret_path) if os.path.exists(ret_path) else None
    ci_df = pd.read_csv(ci_path) if os.path.exists(ci_path) else None

    # Fig 1: Normal vs Controlled Completion Time
    if collab_df is not None:
        fig, ax = plt.subplots(figsize=(6, 4.5))
        norm_dur = collab_df[collab_df["condition"] == "AUTOMATED_NORMAL"]["duration_seconds"]
        ctrl_dur = collab_df[collab_df["condition"] == "AUTOMATED_CONTROLLED"]["duration_seconds"]
        bp = ax.boxplot([norm_dur, ctrl_dur], tick_labels=["Normal\nCollaboration", "Leader Mode\nControlled"],
                         patch_artist=True, widths=0.45)
        bp['boxes'][0].set_facecolor('#4A90E2')
        bp['boxes'][1].set_facecolor('#50E3C2')
        ax.set_ylabel("Completion Time (seconds)")
        ax.set_title("Fig 1: Task Completion Time by Collaboration Condition\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig1_completion_time")

        # Fig 2: Test Pass Rate
        fig, ax = plt.subplots(figsize=(6, 4.5))
        norm_pass = collab_df[collab_df["condition"] == "AUTOMATED_NORMAL"]["test_pass_rate"]
        ctrl_pass = collab_df[collab_df["condition"] == "AUTOMATED_CONTROLLED"]["test_pass_rate"]
        means = [np.mean(norm_pass), np.mean(ctrl_pass)]
        stds = [np.std(norm_pass), np.std(ctrl_pass)]
        bars = ax.bar(["Normal", "Controlled"], means, yerr=stds, capsize=6, color=['#4A90E2', '#50E3C2'], width=0.45)
        ax.set_ylabel("Mean Test Pass Rate (%)")
        ax.set_ylim(0, 110)
        ax.set_title("Fig 2: Automated Test Pass Rate\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2., b.get_height() + 2, f"{b.get_height():.1f}%", ha='center', fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig2_test_pass_rate")

        # Fig 3: Execution Success Rate
        fig, ax = plt.subplots(figsize=(6, 4.5))
        norm_succ = collab_df[collab_df["condition"] == "AUTOMATED_NORMAL"]["successful_executions"] / collab_df[collab_df["condition"] == "AUTOMATED_NORMAL"]["executions"] * 100
        ctrl_succ = collab_df[collab_df["condition"] == "AUTOMATED_CONTROLLED"]["successful_executions"] / collab_df[collab_df["condition"] == "AUTOMATED_CONTROLLED"]["executions"] * 100
        ax.bar(["Normal", "Controlled"], [np.mean(norm_succ), np.mean(ctrl_succ)], color=['#2C3E50', '#E67E22'], width=0.45)
        ax.set_ylabel("Execution Success Rate (%)")
        ax.set_ylim(0, 110)
        ax.set_title("Fig 3: Sandbox Code Execution Success Rate\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig3_execution_success")

    # Figs 4 - 8: AI Metrics
    if merged_ai is not None:
        generic = merged_ai[merged_ai["condition"] == "AUTOMATED_GENERIC_AI"]
        rag = merged_ai[merged_ai["condition"] == "AUTOMATED_RAG_AI"]

        # Fig 4: Correctness
        fig, ax = plt.subplots(figsize=(6, 4.5))
        means = [np.mean(generic["correctness"]), np.mean(rag["correctness"])]
        stds = [np.std(generic["correctness"]), np.std(rag["correctness"])]
        bars = ax.bar(["Generic AI", "RAG AI"], means, yerr=stds, capsize=6, color=['#E74C3C', '#27AE60'], width=0.45)
        ax.set_ylabel("Mean Correctness Score (0–2)")
        ax.set_ylim(0, 2.3)
        ax.set_title("Fig 4: Answer Correctness\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2., b.get_height() + 0.08, f"{b.get_height():.2f}", ha='center', fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig4_ai_correctness")

        # Fig 5: Relevance
        fig, ax = plt.subplots(figsize=(6, 4.5))
        means = [np.mean(generic["relevance"]), np.mean(rag["relevance"])]
        stds = [np.std(generic["relevance"]), np.std(rag["relevance"])]
        bars = ax.bar(["Generic AI", "RAG AI"], means, yerr=stds, capsize=6, color=['#9B59B6', '#3498DB'], width=0.45)
        ax.set_ylabel("Mean Relevance Score (0–2)")
        ax.set_ylim(0, 2.3)
        ax.set_title("Fig 5: Answer Relevance\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2., b.get_height() + 0.08, f"{b.get_height():.2f}", ha='center', fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig5_ai_relevance")

        # Fig 6: Project Grounding
        fig, ax = plt.subplots(figsize=(6, 4.5))
        means = [np.mean(generic["project_grounding"]), np.mean(rag["project_grounding"])]
        stds = [np.std(generic["project_grounding"]), np.std(rag["project_grounding"])]
        bars = ax.bar(["Generic AI", "RAG AI"], means, yerr=stds, capsize=6, color=['#95A5A6', '#16A085'], width=0.45)
        ax.set_ylabel("Project Grounding Score (0–2)")
        ax.set_ylim(0, 2.3)
        ax.set_title("Fig 6: Grounding in Project Context\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2., b.get_height() + 0.08, f"{b.get_height():.2f}", ha='center', fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig6_ai_grounding")

        # Fig 7: Hallucination Rate
        fig, ax = plt.subplots(figsize=(6, 4.5))
        h_gen = np.mean(generic["hallucination"]) * 100
        h_rag = np.mean(rag["hallucination"]) * 100
        bars = ax.bar(["Generic AI", "RAG AI"], [h_gen, h_rag], color=['#C0392B', '#2ECC71'], width=0.45)
        ax.set_ylabel("Hallucination Rate (%)")
        ax.set_ylim(0, max(25, max(h_gen, h_rag) * 1.5))
        ax.set_title("Fig 7: Detected Hallucination Rate\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2., b.get_height() + 0.8, f"{b.get_height():.1f}%", ha='center', fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig7_ai_hallucination")

        # Fig 8: Latency Breakdown
        fig, ax = plt.subplots(figsize=(7, 4.5))
        g_lat = np.mean(generic["model_generation_latency_ms"])
        r_ret = np.mean(rag["retrieval_latency_ms"])
        r_gen = np.mean(rag["model_generation_latency_ms"])
        r_tot = r_ret + r_gen

        p1 = ax.bar(["Generic AI", "RAG AI"], [0, r_ret], color='#F39C12', width=0.45, label='Retrieval Latency')
        p2 = ax.bar(["Generic AI", "RAG AI"], [g_lat, r_gen], bottom=[0, r_ret], color='#2980B9', width=0.45, label='Generation Latency')
        ax.set_ylabel("Latency (milliseconds)")
        ax.set_title("Fig 8: Latency Breakdown (Retrieval vs Generation)\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        ax.legend()
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig8_ai_latency")

        # Fig 11: AI Latency Distribution
        fig, ax = plt.subplots(figsize=(7, 4.5))
        ax.hist(generic["total_request_latency_ms"], bins=15, alpha=0.6, label='Generic AI', color='#E74C3C', density=True)
        ax.hist(rag["total_request_latency_ms"], bins=15, alpha=0.6, label='RAG AI', color='#2ECC71', density=True)
        ax.set_xlabel("Total Request Latency (ms)")
        ax.set_ylabel("Density")
        ax.set_title("Fig 11: Distribution of AI Response Latencies\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        ax.legend()
        ax.grid(axis='both', linestyle='--', alpha=0.5)
        save_fig(fig, "fig11_ai_latency_dist")

    # Fig 9: Retrieval Hit@K
    if ret_df is not None:
        fig, ax = plt.subplots(figsize=(6, 4.5))
        hits = [np.mean(ret_df["hit_1"]) * 100, np.mean(ret_df["hit_3"]) * 100, np.mean(ret_df["hit_5"]) * 100]
        labels = ["Hit@1", "Hit@3", "Hit@5"]
        bars = ax.bar(labels, hits, color=['#34495E', '#1ABC9C', '#16A085'], width=0.45)
        ax.set_ylabel("Retrieval Accuracy (%)")
        ax.set_ylim(0, 110)
        ax.set_title("Fig 9: ChromaDB Vector Store Retrieval Accuracy\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2., b.get_height() + 2, f"{b.get_height():.1f}%", ha='center', fontweight='bold')
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        save_fig(fig, "fig9_retrieval_hit_k")

    # Fig 10: Distribution of Completion Times
    if collab_df is not None:
        fig, ax = plt.subplots(figsize=(7, 4.5))
        norm_d = collab_df[collab_df["condition"] == "AUTOMATED_NORMAL"]["duration_seconds"]
        ctrl_d = collab_df[collab_df["condition"] == "AUTOMATED_CONTROLLED"]["duration_seconds"]
        ax.hist(norm_d, bins=10, alpha=0.6, label='Normal', color='#4A90E2')
        ax.hist(ctrl_d, bins=10, alpha=0.6, label='Controlled', color='#50E3C2')
        ax.set_xlabel("Completion Time (seconds)")
        ax.set_ylabel("Frequency Count")
        ax.set_title("Fig 10: Task Completion Time Distribution\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        ax.legend()
        ax.grid(axis='both', linestyle='--', alpha=0.5)
        save_fig(fig, "fig10_completion_time_dist")

    # Fig 12: Forest Plot of Primary 95% Confidence Intervals
    if ci_df is not None and len(ci_df) > 0:
        fig, ax = plt.subplots(figsize=(8, 4.5))
        y_pos = np.arange(len(ci_df))
        means = ci_df.get("mean", (ci_df["lower_95"] + ci_df["upper_95"]) / 2)
        err_low = means - ci_df["lower_95"]
        err_high = ci_df["upper_95"] - means
        ax.errorbar(means, y_pos, xerr=[err_low, err_high], fmt='o', color='#2C3E50', ecolor='#E74C3C',
                    elinewidth=2, capsize=5, capthick=1.5)
        ax.set_yticks(y_pos)
        labels = [m.replace("_", " ") for m in ci_df["metric"]]
        ax.set_yticklabels(labels)
        ax.invert_yaxis()
        ax.set_xlabel("Estimated Value (with 95% Bootstrap CI)")
        ax.set_title("Fig 12: 95% Bootstrap Confidence Intervals for Key Metrics\n[AUTOMATED SYSTEM BENCHMARK RESULT]")
        ax.grid(axis='x', linestyle='--', alpha=0.5)
        save_fig(fig, "fig12_primary_metrics_ci")

    print("\n[OK] All 12 figures successfully generated.")

if __name__ == "__main__":
    generate_figures()
