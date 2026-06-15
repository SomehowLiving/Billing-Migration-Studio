import React from "react";

const SelectContext = React.createContext(null);

export function Select({ value, onValueChange, children }) {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className = "", children, ...props }) {
  const { value, onValueChange } = React.useContext(SelectContext) || {};
  return (
    <select className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm ${className}`} value={value} onChange={(e) => onValueChange?.(e.target.value)} {...props}>
      {children}
    </select>
  );
}

export function SelectContent({ children }) {
  return <>{children}</>;
}

export function SelectItem({ children, value, ...props }) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  );
}

export function SelectValue({ placeholder = "" }) {
  return <option value="">{placeholder}</option>;
}
