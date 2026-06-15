import React from "react";

export function Button({ className = "", variant = "default", children, ...props }) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const styles =
    variant === "outline"
      ? "border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900"
      : "bg-neutral-900 text-white hover:bg-neutral-800";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
