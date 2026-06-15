import React from "react";

export const Input = React.forwardRef(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm ${className}`} {...props} />;
});

Input.displayName = "Input";
