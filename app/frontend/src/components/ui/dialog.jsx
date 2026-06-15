import React from "react";

const DialogContext = React.createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children, asChild }) {
  const ctx = React.useContext(DialogContext);
  if (asChild) return React.cloneElement(children, { onClick: () => ctx?.onOpenChange?.(true) });
  return <button type="button" onClick={() => ctx?.onOpenChange?.(true)}>{children}</button>;
}

export function DialogContent({ className = "", children }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx?.open) return null;
  return <div className={`fixed inset-0 flex items-center justify-center bg-black/40 p-4 ${className}`}><div className="w-full max-w-lg rounded-lg bg-white p-6">{children}</div></div>;
}

export function DialogHeader({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function DialogFooter({ className = "", children }) {
  return <div className={`mt-4 flex justify-end gap-2 ${className}`}>{children}</div>;
}
