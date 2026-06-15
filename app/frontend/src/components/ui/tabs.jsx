import React from "react";

const TabsContext = React.createContext(null);

export function Tabs({ defaultValue, children, className = "" }) {
  const [value, setValue] = React.useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ className = "", children, ...props }) {
  return <div className={className} {...props}>{children}</div>;
}

export function TabsTrigger({ value, className = "", children, ...props }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;
  return <button type="button" onClick={() => ctx?.setValue(value)} className={className} data-state={active ? "active" : "inactive"} {...props}>{children}</button>;
}

export function TabsContent({ value, children, className = "", ...props }) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={className} {...props}>{children}</div>;
}
