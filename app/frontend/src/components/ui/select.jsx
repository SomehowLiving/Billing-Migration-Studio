import React from "react";

const SelectContext = React.createContext(null);

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={rootRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children, ...props }) {
  const { open, setOpen } = React.useContext(SelectContext) || {};
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 ${className}`}
      onClick={() => setOpen?.((v) => !v)}
      aria-expanded={open}
      {...props}
    >
      {children}
      <span className={`ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 text-[10px] text-neutral-500 transition ${open ? "rotate-180" : ""}`}>
        ▾
      </span>
    </button>
  );
}

export function SelectContent({ children, className = "" }) {
  const { open } = React.useContext(SelectContext) || {};
  if (!open) return null;
  return (
    <div className={`absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg ${className}`}>
      <div className="max-h-64 overflow-y-auto py-1">{children}</div>
    </div>
  );
}

export function SelectItem({ children, value, className = "", ...props }) {
  const { onValueChange, setOpen } = React.useContext(SelectContext) || {};
  return (
    <button
      type="button"
      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-neutral-100 ${className}`}
      onClick={() => {
        onValueChange?.(value);
        setOpen?.(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder = "" }) {
  const { value } = React.useContext(SelectContext) || {};
  return <span className={`truncate ${value ? "text-neutral-900" : "text-neutral-400"}`}>{value || placeholder}</span>;
}
