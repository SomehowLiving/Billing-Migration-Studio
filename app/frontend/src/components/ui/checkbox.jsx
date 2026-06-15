import React from "react";

export function Checkbox({ className = "", ...props }) {
  return <input type="checkbox" className={`h-4 w-4 rounded border-neutral-300 ${className}`} {...props} />;
}
