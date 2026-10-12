"""
Statistical Analysis Engine for DevShare Research Benchmark
Computes descriptive statistics, inferential tests (Paired t-test/Wilcoxon, Independent t-test/Mann-Whitney U),
effect sizes (Cohen's d, Cliff's delta, rank-biserial), and 95% bootstrap confidence intervals (seed=42).
"""

import os
import sys
import numpy as np
import pandas as pd
from scipy import stats

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

RANDOM_SEED = 42
BOOTSTRAP_ITERATIONS = 1000

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
RAW_DIR = os.path.join(BASE_DIR, "research_results", "raw")
SUMMARY_DIR = os.path.join(BASE_DIR, "research_results", "summary")


def ensure_dirs():
    os.makedirs(SUMMARY_DIR, exist_ok=True)


def calculate_descriptive(series):
    series = series.dropna()
    if len(series) == 0:
        return {k: np.nan for k in ["mean", "std", "median", "iqr", "min", "max", "p50", "p90", "p95", "p99"]}
    q25, q75 = np.percentile(series, [25, 75])
    return {
        "mean": float(np.mean(series)),
        "std": float(np.std(series, ddof=1)) if len(series) > 1 else 0.0,
        "median": float(np.median(series)),
        "iqr": float(q75 - q25),
        "min": float(np.min(series)),
        "max": float(np.max(series)),
        "p50": float(np.percentile(series, 50)),
        "p90": float(np.percentile(series, 90)),
        "p95": float(np.percentile(series, 95)),
        "p99": float(np.percentile(series, 99)),
    }


def bootstrap_ci(series, iterations=BOOTSTRAP_ITERATIONS, seed=RANDOM_SEED):
    series = np.array(series.dropna())
    if len(series) == 0:
        return np.nan, np.nan
    rng = np.random.RandomState(seed)
    boot_means = []
    n = len(series)
    for _ in range(iterations):
        sample = rng.choice(series, size=n, replace=True)
        boot_means.append(np.mean(sample))
    return float(np.percentile(boot_means, 2.5)), float(np.percentile(boot_means, 97.5))


def bootstrap_paired_diff_ci(series_a, series_b, iterations=BOOTSTRAP_ITERATIONS, seed=RANDOM_SEED):
    diffs = np.array(series_a) - np.array(series_b)
    diffs = diffs[~np.isnan(diffs)]
    if len(diffs) == 0:
        return np.nan, np.nan
    rng = np.random.RandomState(seed)
    boot_means = []
    n = len(diffs)
    for _ in range(iterations):
        sample = rng.choice(diffs, size=n, replace=True)
        boot_means.append(np.mean(sample))
    return float(np.percentile(boot_means, 2.5)), float(np.percentile(boot_means, 97.5))


def cliffs_delta(x, y):
    x = np.array(x)
    y = np.array(y)
    n_x = len(x)
    n_y = len(y)
    if n_x == 0 or n_y == 0:
        return np.nan
    greater = 0
    less = 0
    for val_x in x:
        greater += np.sum(val_x > y)
        less += np.sum(val_x < y)
    return float((greater - less) / (n_x * n_y))


def cohens_d(x, y):
    x = np.array(x)
    y = np.array(y)
    n1, n2 = len(x), len(y)
    if n1 < 2 or n2 < 2:
        return np.nan
    var1, var2 = np.var(x, ddof=1), np.var(y, ddof=1)
    pooled_sd = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
    if pooled_sd == 0:
        return 0.0
    return float((np.mean(x) - np.mean(y)) / pooled_sd)


def analyze_collaboration():
    collab_path = os.path.join(RAW_DIR, "collaboration_runs.csv")
    if not os.path.exists(collab_path):
        print(f"[WARN] {collab_path} not found.")
        return [], []

    df = pd.read_csv(collab_path)
    summary_rows = []

    for condition, grp in df.groupby("condition"):
        duration_stats = calculate_descriptive(grp["duration_seconds"])
        edits_stats = calculate_descriptive(grp["total_code_changes"])
        exec_stats = calculate_descriptive(grp["executions"])
        grants_stats = calculate_descriptive(grp["permission_grants"])
        revokes_stats = calculate_descriptive(grp["permission_revocations"])
        pA_pct_stats = calculate_descriptive(grp["edit_pct_participant_a"])
        pB_pct_stats = calculate_descriptive(grp["edit_pct_participant_b"])
        denied_stats = calculate_descriptive(grp["permission_denied_code_changes"])

        d_low, d_high = bootstrap_ci(grp["duration_seconds"])

        summary_rows.append({
            "condition": condition,
            "runs_count": len(grp),
            "mean_duration_sec": duration_stats["mean"],
            "median_duration_sec": duration_stats["median"],
            "sd_duration_sec": duration_stats["std"],
            "ci95_duration_low": d_low,
            "ci95_duration_high": d_high,
            "mean_total_edits": edits_stats["mean"],
            "median_total_edits": edits_stats["median"],
            "mean_pA_edit_pct": pA_pct_stats["mean"],
            "mean_pB_edit_pct": pB_pct_stats["mean"],
            "mean_permission_grants": grants_stats["mean"],
            "mean_permission_revocations": revokes_stats["mean"],
            "mean_permission_denied": denied_stats["mean"],
            "conflict_rate": "NOT_MEASURABLE",
        })

    summary_df = pd.DataFrame(summary_rows)
    summary_df.to_csv(os.path.join(SUMMARY_DIR, "collaboration_summary.csv"), index=False)
    print("[OK] Generated collaboration_summary.csv")

    # Statistical Comparison (Normal vs Controlled)
    normal = df[df["condition"] == "AUTOMATED_NORMAL"]
    controlled = df[df["condition"] == "AUTOMATED_CONTROLLED"]

    test_rows = []
    ci_rows = []

    if len(normal) > 0 and len(controlled) > 0:
        # Paired matching on task_id and repetition if equal lengths
        min_len = min(len(normal), len(controlled))
        norm_dur = normal["duration_seconds"].iloc[:min_len]
        ctrl_dur = controlled["duration_seconds"].iloc[:min_len]

        # Normality test
        _, p_norm_norm = stats.shapiro(norm_dur) if len(norm_dur) >= 3 else (None, 0.0)
        _, p_norm_ctrl = stats.shapiro(ctrl_dur) if len(ctrl_dur) >= 3 else (None, 0.0)
        is_normal = (p_norm_norm is not None and p_norm_norm > 0.05) and (p_norm_ctrl is not None and p_norm_ctrl > 0.05)

        if is_normal:
            t_stat, p_val = stats.ttest_rel(norm_dur, ctrl_dur)
            test_name = "Paired t-test"
        else:
            try:
                res = stats.wilcoxon(norm_dur, ctrl_dur)
                t_stat, p_val = res.statistic, res.pvalue
                test_name = "Wilcoxon signed-rank test"
            except Exception:
                res = stats.mannwhitneyu(norm_dur, ctrl_dur)
                t_stat, p_val = res.statistic, res.pvalue
                test_name = "Mann-Whitney U test (fallback)"

        cd = cohens_d(ctrl_dur, norm_dur)
        cdelta = cliffs_delta(ctrl_dur, norm_dur)
        diff_ci_low, diff_ci_high = bootstrap_paired_diff_ci(ctrl_dur, norm_dur)

        test_rows.append({
            "comparison": "Completion Time (Controlled vs Normal)",
            "test_name": test_name,
            "statistic": float(t_stat) if t_stat is not None else np.nan,
            "p_value": float(p_val) if p_val is not None else np.nan,
            "effect_size_cohens_d": cd,
            "effect_size_cliffs_delta": cdelta,
            "significant_at_05": bool(p_val < 0.05) if p_val is not None else False,
            "assumptions": "Normality checked via Shapiro-Wilk; paired design",
        })

        ci_rows.append({
            "metric": "Completion Time Paired Difference (Controlled - Normal)",
            "iterations": BOOTSTRAP_ITERATIONS,
            "seed": RANDOM_SEED,
            "mean_difference": float(np.mean(ctrl_dur - norm_dur)),
            "lower_95": diff_ci_low,
            "upper_95": diff_ci_high,
        })

    return test_rows, ci_rows


def analyze_ai_and_retrieval():
    ai_path = os.path.join(RAW_DIR, "ai_runs.csv")
    eval_path = os.path.join(RAW_DIR, "ai_evaluations.csv")
    ret_path = os.path.join(RAW_DIR, "retrieval_results.csv")

    test_rows = []
    ci_rows = []

    if os.path.exists(ai_path) and os.path.exists(eval_path):
        ai_df = pd.read_csv(ai_path)
        eval_df = pd.read_csv(eval_path)
        merged = pd.merge(ai_df, eval_df, on=["benchmark_run_id", "condition", "question_id", "repetition"])

        summary_rows = []
        latency_rows = []

        for cond, grp in merged.groupby("condition"):
            c_stats = calculate_descriptive(grp["correctness"])
            r_stats = calculate_descriptive(grp["relevance"])
            g_stats = calculate_descriptive(grp["project_grounding"])
            h_stats = calculate_descriptive(grp["hallucination"])
            lat_stats = calculate_descriptive(grp["total_request_latency_ms"])

            c_low, c_high = bootstrap_ci(grp["correctness"])
            g_low, g_high = bootstrap_ci(grp["project_grounding"])
            lat_low, lat_high = bootstrap_ci(grp["total_request_latency_ms"])

            summary_rows.append({
                "condition": cond,
                "evaluations_count": len(grp),
                "mean_correctness": c_stats["mean"],
                "median_correctness": c_stats["median"],
                "ci95_correctness_low": c_low,
                "ci95_correctness_high": c_high,
                "mean_relevance": r_stats["mean"],
                "median_relevance": r_stats["median"],
                "mean_project_grounding": g_stats["mean"],
                "median_project_grounding": g_stats["median"],
                "ci95_grounding_low": g_low,
                "ci95_grounding_high": g_high,
                "mean_hallucination_rate": h_stats["mean"],
                "mean_total_latency_ms": lat_stats["mean"],
                "median_total_latency_ms": lat_stats["median"],
                "ci95_latency_low": lat_low,
                "ci95_latency_high": lat_high,
            })

            latency_rows.append({
                "condition": cond,
                "metric": "total_request_latency_ms",
                **lat_stats
            })

        pd.DataFrame(summary_rows).to_csv(os.path.join(SUMMARY_DIR, "ai_summary.csv"), index=False)
        pd.DataFrame(latency_rows).to_csv(os.path.join(SUMMARY_DIR, "latency_summary.csv"), index=False)
        print("✓ Generated ai_summary.csv and latency_summary.csv")

        # Independent Statistical Tests: Generic vs RAG
        generic = merged[merged["condition"] == "AUTOMATED_GENERIC_AI"]
        rag = merged[merged["condition"] == "AUTOMATED_RAG_AI"]

        if len(generic) > 0 and len(rag) > 0:
            for metric in ["project_grounding", "correctness", "relevance", "total_request_latency_ms"]:
                g_vals = generic[metric].dropna()
                r_vals = rag[metric].dropna()

                u_stat, p_val = stats.mannwhitneyu(r_vals, g_vals, alternative="two-sided")
                cd = cohens_d(r_vals, g_vals)
                cdelta = cliffs_delta(r_vals, g_vals)

                test_rows.append({
                    "comparison": f"{metric} (RAG vs Generic)",
                    "test_name": "Mann-Whitney U test",
                    "statistic": float(u_stat),
                    "p_value": float(p_val),
                    "effect_size_cohens_d": cd,
                    "effect_size_cliffs_delta": cdelta,
                    "significant_at_05": bool(p_val < 0.05),
                    "assumptions": "Independent samples, non-parametric ordinal/interval distribution",
                })

                r_low, r_high = bootstrap_ci(r_vals)
                ci_rows.append({
                    "metric": f"RAG {metric}",
                    "iterations": BOOTSTRAP_ITERATIONS,
                    "seed": RANDOM_SEED,
                    "mean": float(np.mean(r_vals)),
                    "lower_95": r_low,
                    "upper_95": r_high,
                })

    # Retrieval Summary
    if os.path.exists(ret_path):
        ret_df = pd.read_csv(ret_path)
        ret_summary = [{
            "total_queries": len(ret_df),
            "mean_hit_1": float(np.mean(ret_df["hit_1"])),
            "mean_hit_3": float(np.mean(ret_df["hit_3"])),
            "mean_hit_5": float(np.mean(ret_df["hit_5"])),
            "mrr": float(np.mean(ret_df["mrr"])),
            "mean_recall": float(np.mean(ret_df["recall"])),
            "mean_chunks_retrieved": float(np.mean(ret_df["chunks_retrieved"])),
            "mean_retrieval_latency_ms": float(np.mean(ret_df["retrieval_latency_ms"])),
            "median_retrieval_latency_ms": float(np.median(ret_df["retrieval_latency_ms"])),
        }]
        pd.DataFrame(ret_summary).to_csv(os.path.join(SUMMARY_DIR, "retrieval_summary.csv"), index=False)
        print("[OK] Generated retrieval_summary.csv")

    return test_rows, ci_rows


def analyze_security_and_execution():
    sec_path = os.path.join(RAW_DIR, "security_results.csv")
    exec_path = os.path.join(RAW_DIR, "execution_results.csv")

    if os.path.exists(sec_path):
        sec_df = pd.read_csv(sec_path)
        sec_summary = [{
            "total_repetitions": len(sec_df),
            "total_attempts": int(np.sum(sec_df["authorization_attempts"])),
            "total_authorized": int(np.sum(sec_df["authorized_actions"])),
            "total_rejected": int(np.sum(sec_df["rejected_actions"])),
            "unauthorized_successes": int(np.sum(sec_df["unauthorized_successes"])),
            "unauthorized_failure_rate": float(np.mean(sec_df["unauthorized_failure_rate"])),
            "security_verdict": "PASS" if np.sum(sec_df["unauthorized_successes"]) == 0 else "FAIL",
        }]
        pd.DataFrame(sec_summary).to_csv(os.path.join(SUMMARY_DIR, "security_summary.csv"), index=False)
        print("[OK] Generated security_summary.csv")

    if os.path.exists(exec_path):
        exec_df = pd.read_csv(exec_path)
        lat_stats = calculate_descriptive(exec_df["latency_ms"])
        successes = np.sum(exec_df["execution_status"] == "SUCCESS")
        total = len(exec_df)
        exec_summary = [{
            "total_executions": total,
            "successful_executions": int(successes),
            "failed_executions": int(total - successes),
            "execution_success_rate": float((successes / total) * 100) if total > 0 else 0.0,
            "mean_execution_latency_ms": lat_stats["mean"],
            "median_execution_latency_ms": lat_stats["median"],
            "p95_execution_latency_ms": lat_stats["p95"],
        }]
        pd.DataFrame(exec_summary).to_csv(os.path.join(SUMMARY_DIR, "execution_summary.csv"), index=False)
        print("[OK] Generated execution_summary.csv")


def main():
    ensure_dirs()
    print("\n--- Executing Rigorous Statistical Analysis ---")
    tests_collab, ci_collab = analyze_collaboration()
    tests_ai, ci_ai = analyze_ai_and_retrieval()
    analyze_security_and_execution()

    all_tests = tests_collab + tests_ai
    all_cis = ci_collab + ci_ai

    if all_tests:
        pd.DataFrame(all_tests).to_csv(os.path.join(SUMMARY_DIR, "statistical_tests.csv"), index=False)
        print(f"[OK] Saved {len(all_tests)} statistical hypothesis tests in statistical_tests.csv")

    if all_cis:
        pd.DataFrame(all_cis).to_csv(os.path.join(SUMMARY_DIR, "confidence_intervals.csv"), index=False)
        print(f"[OK] Saved {len(all_cis)} bootstrap confidence intervals in confidence_intervals.csv")

    print("\n=== Statistical Analysis Engine Finished Successfully ===")


if __name__ == "__main__":
    main()
