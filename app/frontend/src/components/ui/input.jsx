import React from "react";

export function Input({ className = "", ...props }) {
  return <input className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm ${className}`} {...props} />;
}
