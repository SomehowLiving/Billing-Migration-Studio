import React from "react";

export function Textarea({ className = "", ...props }) {
  return <textarea className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm ${className}`} {...props} />;
}
