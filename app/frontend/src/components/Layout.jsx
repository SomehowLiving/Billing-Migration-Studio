import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Gauge, Database, Stack, ArrowsLeftRight, Receipt, SignOut, Users, Checks,
} from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import { Toaster } from "./ui/sonner";

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge, tid: "nav-dashboard" },
  { to: "/sources", label: "Data Sources", icon: Database, tid: "nav-sources" },
  { to: "/mappings", label: "Mappings", icon: ArrowsLeftRight, tid: "nav-mappings" },
  { to: "/migrations", label: "Migrations", icon: Stack, tid: "nav-migrations" },
{ to: "/onboarding", label: "Onboarding", icon: Checks, tid: "nav-onboarding" },
  { to: "/customers", label: "Customers", icon: Users, tid: "nav-customers" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#fafafa]">
      <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col" data-testid="sidebar">
        <div className="h-16 border-b border-neutral-200 flex items-center px-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-neutral-900 flex items-center justify-center">
              <Receipt size={16} weight="bold" color="#fff" />
            </div>
            <div>
              <div className="font-display font-black text-[15px] leading-none tracking-tight">
                Billing Migration
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500 mt-1">
                Studio
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={item.tid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`
              }
            >
              <item.icon size={16} weight="duotone" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <div className="px-2 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" data-testid="user-name">
                {user?.name || "User"}
              </div>
              <div className="text-[11px] font-mono text-neutral-500 truncate">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
              title="Sign out"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="px-8 py-8 max-w-[1400px]">{children}</div>
      </main>
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
