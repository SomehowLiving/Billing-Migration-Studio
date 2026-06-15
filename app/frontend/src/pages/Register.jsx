import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "../lib/api";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6" data-testid="register-form">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            Create account
          </div>
          <h2 className="font-display text-3xl font-black tracking-tighter mt-2">
            Get started.
          </h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-mono">Name</Label>
            <Input data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-mono">Email</Label>
            <Input data-testid="register-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] font-mono">Password</Label>
            <Input data-testid="register-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5" />
          </div>
        </div>
        <Button type="submit" disabled={loading} data-testid="register-submit-button" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-11">
          {loading ? "Creating…" : "Create account"}
        </Button>
        <div className="text-sm text-neutral-500 text-center">
          Have an account?{" "}
          <Link to="/login" data-testid="goto-login-link" className="text-neutral-900 underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
