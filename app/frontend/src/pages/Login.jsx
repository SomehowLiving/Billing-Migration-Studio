import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "../lib/api";
import { Receipt } from "@phosphor-icons/react";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Signed in");
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-neutral-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-white flex items-center justify-center">
              <Receipt size={16} weight="bold" color="#09090b" />
            </div>
            <div className="font-display font-black text-lg tracking-tight">
              Billing Migration Studio
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-5xl font-black tracking-tighter leading-[0.95]">
            Ship customer<br/>onboarding<br/>at enterprise speed.
          </h1>
          <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
            Validate, map and migrate billing data across Stripe, Chargebee, CSV exports and internal
            systems—with a full audit trail behind every record.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-6 max-w-md">
            {[
              ["CSV", "delimiter + encoding detection"],
              ["Stripe", "incremental + full sync"],
              ["Validate", "before you write"],
            ].map(([t, d]) => (
              <div key={t} className="border border-neutral-800 p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  {t}
                </div>
                <div className="text-xs mt-2 text-neutral-300">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          v1.0 · build {new Date().getFullYear()}
        </div>
      </div>
      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
              Sign in
            </div>
            <h2 className="font-display text-3xl font-black tracking-tighter mt-2">
              Welcome back.
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Use the seeded admin credentials or create a new account.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] font-mono">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] font-mono">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit-button"
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-11 rounded-md"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <div className="text-sm text-neutral-500 text-center">
            No account?{" "}
            <Link to="/register" data-testid="goto-register-link" className="text-neutral-900 underline underline-offset-2 font-medium">
              Create one
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
