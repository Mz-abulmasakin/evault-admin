"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { saveAdminToken } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Enter your admin username/email and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/admin/auth/login", {
        identifier: identifier.trim(),
        password,
      });
      const token = response?.data?.data?.token;
      if (!token) throw new Error("The server did not return an admin token.");
      saveAdminToken(token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-black text-white shadow-xl shadow-blue-950/50">e</div>
          <h1 className="text-3xl font-bold tracking-tight text-white">eVault Admin</h1>
          <p className="mt-2 text-sm text-slate-400">Secure administration portal</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur sm:p-8">
          <h2 className="text-xl font-semibold text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-400">Sign in with your administrator account.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-slate-300">Username or email</label>
              <input id="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" disabled={loading} placeholder="Enter username or email" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={loading} placeholder="Enter password" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-20 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:text-white">{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in to eVault"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">Authorized eVault personnel only</p>
      </div>
    </main>
  );
}
