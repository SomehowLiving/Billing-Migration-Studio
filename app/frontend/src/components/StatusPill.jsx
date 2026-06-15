import React from "react";

const variants = {
  success: "pill pill-success",
  failed: "pill pill-error",
  error: "pill pill-error",
  warning: "pill pill-warning",
  running: "pill pill-info",
  pending: "pill pill-neutral",
  completed: "pill pill-success",
  rolled_back: "pill pill-warning",
  dry_run: "pill pill-info",
  actual: "pill pill-success",
};

export default function StatusPill({ status, children, ...rest }) {
  const cls = variants[status] || "pill pill-neutral";
  return (
    <span className={cls} {...rest}>
      <span
        className="dot"
        style={{
          background:
            status === "completed" || status === "success" ? "#10b981" :
            status === "failed" || status === "error" ? "#e11d48" :
            status === "running" ? "#3b82f6" :
            status === "warning" || status === "rolled_back" ? "#f59e0b" :
            "#a1a1aa",
        }}
      />
      {children || status}
    </span>
  );
}
