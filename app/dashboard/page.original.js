"use client";

import { useEffect, useState } from "react";
import ProtectedLayout from "../../components/ProtectedLayout";
import api from "../../lib/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG");
}

function StatCard({ label, value, hint, accent = "blue" }) {
  const accents = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accents[accent]}`}>eVault</span>
      </div>
      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900">{value ?? 0}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function DashboardContent() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/admin/dashboard");
        if (active) setDashboard(response?.data?.data || null);
      } catch (err) {
        if (active) setError(err?.response?.data?.message || err?.message || "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  const users = dashboard?.users || {};
  const wallets = dashboard?.wallets || {};
  const transactions = dashboard?.transactions || {};

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Platform overview</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor eVault customers, wallets and transaction activity.</p>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Live database summary</span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total customers" value={Number(users.total || 0).toLocaleString("en-NG")} hint={`${Number(users.active || 0).toLocaleString("en-NG")} active`} />
        <StatCard label="Suspended customers" value={Number(users.suspended || 0).toLocaleString("en-NG")} accent="amber" />
        <StatCard label="Total transactions" value={Number(transactions.totalTransactions || 0).toLocaleString("en-NG")} />
        <StatCard label="Successful transactions" value={Number(transactions.successfulTransactions || 0).toLocaleString("en-NG")} accent="green" />
        <StatCard label="Available wallet balance" value={formatCurrency(wallets.totalAvailableBalance)} hint="Across all wallets" accent="blue" />
        <StatCard label="Ledger wallet balance" value={formatCurrency(wallets.totalLedgerBalance)} hint="Across all wallets" accent="slate" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Transaction breakdown</h2>
              <p className="mt-1 text-xs text-slate-500">Successful transactions grouped by type</p>
            </div>
          </div>
          {dashboard?.transactionTypes?.length ? (
            <div className="space-y-3">
              {dashboard.transactionTypes.map((item) => (
                <div key={item.type} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.type}</p>
                    <p className="mt-1 text-xs text-slate-400">{Number(item.count || 0).toLocaleString("en-NG")} transactions</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-bold text-slate-800">{formatCurrency(item.volume)}</p>
                </div>
              ))}
            </div>
          ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No transaction type data is available.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">Recent transactions</h2>
            <p className="mt-1 text-xs text-slate-500">Latest activity recorded in the ledger</p>
          </div>
          {dashboard?.recentTransactions?.length ? (
            <div className="space-y-3">
              {dashboard.recentTransactions.slice(0, 7).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.full_name || item.username || "Customer"}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{item.reference} · {item.type}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No transactions recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return <ProtectedLayout><DashboardContent /></ProtectedLayout>;
}
