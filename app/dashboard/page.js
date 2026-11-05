
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "../../lib/auth";

const API_BASE =
  "https://evault-backend-lm13.onrender.com/api/v1";

const BRAND = "#2a5fd3";

// =========================================================
// FORMATTERS
// =========================================================

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-NG");

const moneyFormat = (value) =>
  `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateFormat = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const percentage = (value, total) => {
  if (!Number(total) || Number(total) <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (Number(value || 0) / Number(total)) * 100)
  );
};

// =========================================================
// ICON
// =========================================================

function Icon({ children, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center ${className}`}
    >
      {children}
    </span>
  );
}

// =========================================================
// SECTION HEADER
// =========================================================

function SectionTitle({
  title,
  subtitle,
  href,
  linkText = "View all",
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-[#142747] sm:text-lg">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#dce7ff] bg-[#f4f7ff] px-3.5 py-2.5 text-xs font-bold text-[#2a5fd3] transition hover:border-[#2a5fd3] hover:bg-[#eaf0ff]"
        >
          {linkText}
          <span>→</span>
        </Link>
      )}
    </div>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({ status }) {
  const value = String(status || "PENDING").toUpperCase();

  const styles = {
    SUCCESS: "border-emerald-100 bg-emerald-50 text-emerald-700",
    COMPLETED: "border-emerald-100 bg-emerald-50 text-emerald-700",
    PENDING: "border-amber-100 bg-amber-50 text-amber-700",
    PROCESSING: "border-blue-100 bg-blue-50 text-blue-700",
    FAILED: "border-red-100 bg-red-50 text-red-700",
    REFUNDED: "border-purple-100 bg-purple-50 text-purple-700",
    REVERSED: "border-slate-200 bg-slate-100 text-slate-600",
    ACTIVE: "border-emerald-100 bg-emerald-50 text-emerald-700",
    SUSPENDED: "border-amber-100 bg-amber-50 text-amber-700",
    DISABLED: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide ${
        styles[value] ||
        "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}

// =========================================================
// LOADING SKELETON
// =========================================================

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-100 ${className}`}
    />
  );
}

// =========================================================
// STATISTIC CARD
// =========================================================

function MetricCard({
  label,
  value,
  hint,
  icon,
  accent = "blue",
  loading,
}) {
  const accents = {
    blue: {
      icon: "bg-[#edf3ff] text-[#2a5fd3]",
      line: "bg-[#2a5fd3]",
      value: "text-[#142747]",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      line: "bg-emerald-500",
      value: "text-emerald-700",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      line: "bg-amber-500",
      value: "text-amber-700",
    },
    red: {
      icon: "bg-red-50 text-red-600",
      line: "bg-red-500",
      value: "text-red-700",
    },
  };

  const style = accents[accent] || accents.blue;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#e7edf7] bg-white p-5 shadow-[0_3px_14px_rgba(16,38,77,0.035)] transition duration-300 hover:-translate-y-1 hover:border-[#cbdcff] hover:shadow-[0_12px_30px_rgba(42,95,211,0.09)]">
      <div
        className={`absolute inset-x-0 top-0 h-[3px] ${style.line}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">
            {label}
          </p>

          {loading ? (
            <Skeleton className="mt-4 h-8 w-28" />
          ) : (
            <p
              className={`mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-[28px] ${style.value}`}
            >
              {value}
            </p>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {hint}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({ message }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f4ff] text-2xl font-bold text-[#2a5fd3]">
        ◇
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {message}
      </p>
    </div>
  );
}

// =========================================================
// WALLET BALANCE CARD
// =========================================================

function WalletBalanceCard({
  title,
  amount,
  description,
  loading,
  variant = "primary",
}) {
  const primary = variant === "primary";

  return (
    <div
      className={`relative isolate overflow-hidden rounded-[24px] p-6 shadow-sm sm:p-7 ${
        primary
          ? "bg-gradient-to-br from-[#153c80] via-[#2253ae] to-[#2a5fd3] text-white"
          : "border border-[#e5ebf6] bg-white text-[#142747]"
      }`}
    >
      {primary && (
        <>
          <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border-[28px] border-white/[0.07]" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/[0.05]" />
          <div className="pointer-events-none absolute right-8 top-8 h-4 w-4 rounded-full bg-white/20" />
        </>
      )}

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-sm font-semibold ${
              primary ? "text-blue-100" : "text-slate-500"
            }`}
          >
            {title}
          </p>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-extrabold ${
              primary
                ? "bg-white/15 text-white"
                : "bg-[#edf3ff] text-[#2a5fd3]"
            }`}
          >
            ₦
          </div>
        </div>

        {loading ? (
          <Skeleton
            className={`mt-7 h-10 w-48 ${
              primary ? "bg-white/20" : "bg-slate-100"
            }`}
          />
        ) : (
          <p className="mt-7 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
            {moneyFormat(amount)}
          </p>
        )}

        <p
          className={`mt-3 text-xs leading-relaxed ${
            primary ? "text-blue-100" : "text-slate-400"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// =========================================================
// PERFORMANCE BAR
// =========================================================

function PerformanceItem({
  label,
  count,
  total,
  color,
  loading,
}) {
  const progress = percentage(count, total);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-600">
          {label}
        </span>

        <span className="text-xs font-extrabold text-slate-800">
          {loading ? "—" : numberFormat(count)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${loading ? 0 : progress}%` }}
        />
      </div>

      <p className="mt-1.5 text-right text-[10px] text-slate-400">
        {loading ? "—" : `${progress.toFixed(1)}% of total`}
      </p>
    </div>
  );
}

// =========================================================
// MAIN DASHBOARD
// =========================================================

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // -------------------------------------------------------
  // FETCH DASHBOARD
  // -------------------------------------------------------

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Your admin session has expired. Please log in again."
        );
      }

      const response = await fetch(
        `${API_BASE}/admin/dashboard`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response. Please try again."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load dashboard."
        );
      }

      if (!result.data) {
        throw new Error("Dashboard data was not returned.");
      }

      setDashboard(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // -------------------------------------------------------
  // BACKEND DATA MAPPING
  // -------------------------------------------------------

  const data = dashboard || {};

  const users = data.users || {};
  const wallets = data.wallets || {};
  const transactions = data.transactions || {};

  const recentTransactions = Array.isArray(data.recentTransactions)
    ? data.recentTransactions
    : [];

  const recentUsers = Array.isArray(data.recentUsers)
    ? data.recentUsers
    : [];

  const transactionTypes = Array.isArray(data.transactionTypes)
    ? data.transactionTypes
    : [];

  // -------------------------------------------------------
  // DERIVED PERFORMANCE VALUES
  // -------------------------------------------------------

  const performance = useMemo(() => {
    const total = Number(transactions.totalTransactions || 0);
    const successful = Number(
      transactions.successfulTransactions || 0
    );
    const pending = Number(
      transactions.pendingTransactions || 0
    );
    const failed = Number(
      transactions.failedTransactions || 0
    );

    return {
      total,
      successful,
      pending,
      failed,
      successRate: percentage(successful, total),
    };
  }, [transactions]);

  // -------------------------------------------------------
  // STATISTICS
  // -------------------------------------------------------

  const statistics = [
    {
      label: "Total Customers",
      value: numberFormat(users.total),
      hint: "All registered eVault customers",
      icon: "♙",
      accent: "blue",
    },
    {
      label: "Active Customers",
      value: numberFormat(users.active),
      hint: "Currently active accounts",
      icon: "✓",
      accent: "green",
    },
    {
      label: "Total Transactions",
      value: numberFormat(transactions.totalTransactions),
      hint: "All recorded transactions",
      icon: "⇄",
      accent: "blue",
    },
    {
      label: "Successful Transactions",
      value: numberFormat(transactions.successfulTransactions),
      hint: "Successfully completed",
      icon: "✓",
      accent: "green",
    },
    {
      label: "Pending Transactions",
      value: numberFormat(transactions.pendingTransactions),
      hint: "Awaiting completion",
      icon: "◷",
      accent: "amber",
    },
    {
      label: "Failed Transactions",
      value: numberFormat(transactions.failedTransactions),
      hint: "Unsuccessful transactions",
      icon: "!",
      accent: "red",
    },
  ];

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <main className="min-h-full space-y-7 bg-[#f6f8fc] pb-10">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="relative isolate overflow-hidden rounded-[26px] bg-gradient-to-br from-[#142e59] via-[#1d478f] to-[#2a5fd3] px-6 py-7 text-white shadow-[0_14px_35px_rgba(42,95,211,0.16)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-white/[0.035]" />
        <div className="pointer-events-none absolute right-16 top-16 h-3 w-3 rounded-full bg-white/20" />

        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-xl font-black text-white shadow-sm">
                e
              </div>

              <div>
                <p className="text-sm font-extrabold tracking-wide">
                  eVault
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-100">
                  Administration Portal
                </p>
              </div>

              <span className="ml-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-100">
                Overview
              </span>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200">
              Your platform at a glance
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100">
              Welcome to eVault administration. Monitor customer
              activity, wallet balances and transactions from one
              central workspace.
            </p>
          </div>

          <div className="relative flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                Dashboard status
              </p>

              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    error
                      ? "bg-red-300"
                      : loading
                      ? "animate-pulse bg-amber-300"
                      : "bg-emerald-300"
                  }`}
                />

                <span className="text-xs font-bold text-white">
                  {error
                    ? "Connection issue"
                    : loading
                    ? "Updating dashboard"
                    : "Data loaded"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#2457b8] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={`text-lg ${
                  loading ? "animate-spin" : ""
                }`}
              >
                ↻
              </span>

              {loading ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </div>
        </div>

        {lastUpdated && !loading && (
          <div className="relative mt-7 border-t border-white/15 pt-4 text-[10px] text-blue-100">
            Last updated {lastUpdated.toLocaleString("en-NG")}
          </div>
        )}
      </section>

      {/* =================================================
          ERROR MESSAGE
      ================================================= */}

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg text-red-600">
              !
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-red-700">
                Dashboard loading error
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="w-fit rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* =================================================
          PLATFORM STATISTICS
      ================================================= */}

      <section>
        <SectionTitle
          title="Platform Statistics"
          subtitle="An overview of customer activity and transaction performance."
          href="/users"
          linkText="Manage customers"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statistics.map((item) => (
            <MetricCard
              key={item.label}
              {...item}
              loading={loading}
            />
          ))}
        </div>
      </section>

      {/* =================================================
          WALLET OVERVIEW
      ================================================= */}

      <section>
        <SectionTitle
          title="Wallet Overview"
          subtitle="Monitor the combined financial position of customer wallets."
          href="/users"
          linkText="Manage wallets"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WalletBalanceCard
            title="Total Available Wallet Balance"
            amount={wallets.totalAvailableBalance}
            description="Combined available funds across customer wallets."
            loading={loading}
            variant="primary"
          />

          <WalletBalanceCard
            title="Total Ledger Balance"
            amount={wallets.totalLedgerBalance}
            description="Combined ledger balance across customer wallets."
            loading={loading}
            variant="secondary"
          />
        </div>
      </section>

      {/* =================================================
          TRANSACTION PERFORMANCE
      ================================================= */}

      <section className="rounded-[24px] border border-[#e7edf7] bg-white p-5 shadow-[0_3px_14px_rgba(16,38,77,0.035)] sm:p-7">
        <SectionTitle
          title="Transaction Performance"
          subtitle="Understand how transactions are performing across the platform."
          href="/transactions"
          linkText="View transactions"
        />

        <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#e8f5ed] bg-[#f4fbf6] p-4">
              <div className="h-2 w-8 rounded-full bg-emerald-500" />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Successful
              </p>
              <p className="mt-2 text-2xl font-extrabold text-emerald-800">
                {loading
                  ? "—"
                  : numberFormat(transactions.successfulTransactions)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#fff2d9] bg-[#fffbf2] p-4">
              <div className="h-2 w-8 rounded-full bg-amber-400" />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Pending
              </p>
              <p className="mt-2 text-2xl font-extrabold text-amber-800">
                {loading
                  ? "—"
                  : numberFormat(transactions.pendingTransactions)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#fde8e8] bg-[#fff6f6] p-4">
              <div className="h-2 w-8 rounded-full bg-red-500" />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-red-700">
                Failed
              </p>
              <p className="mt-2 text-2xl font-extrabold text-red-800">
                {loading
                  ? "—"
                  : numberFormat(transactions.failedTransactions)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="h-2 w-8 rounded-full bg-slate-500" />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                Reversed
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-800">
                {loading
                  ? "—"
                  : numberFormat(transactions.reversedTransactions)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#f7f9fe] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#142747]">
                  Transaction success rate
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Successful transactions against total transactions
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0ff] text-xl font-extrabold text-[#2a5fd3]">
                %
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <p className="text-4xl font-extrabold tracking-tight text-[#2457b8]">
                {loading
                  ? "—"
                  : `${performance.successRate.toFixed(1)}%`}
              </p>

              <p className="pb-1 text-[10px] font-medium text-slate-400">
                success rate
              </p>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e4eaf5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2457b8] to-[#2a5fd3] transition-all duration-700"
                style={{
                  width: `${
                    loading ? 0 : performance.successRate
                  }%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-[10px] text-slate-500">
              <span>
                {loading
                  ? "—"
                  : numberFormat(performance.successful)}
                {" "}successful
              </span>
              <span>
                {loading
                  ? "—"
                  : numberFormat(performance.total)}
                {" "}total
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-3">
          <PerformanceItem
            label="Successful"
            count={transactions.successfulTransactions}
            total={transactions.totalTransactions}
            color="bg-emerald-500"
            loading={loading}
          />

          <PerformanceItem
            label="Pending"
            count={transactions.pendingTransactions}
            total={transactions.totalTransactions}
            color="bg-amber-400"
            loading={loading}
          />

          <PerformanceItem
            label="Failed"
            count={transactions.failedTransactions}
            total={transactions.totalTransactions}
            color="bg-red-500"
            loading={loading}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[#e5edff] bg-gradient-to-r from-[#f1f5ff] to-[#f8faff] p-5">
          <p className="text-xs font-bold text-[#36558f]">
            Successful Transaction Volume
          </p>

          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#193b79] sm:text-3xl">
            {loading
              ? "Loading..."
              : moneyFormat(transactions.successfulTransactionVolume)}
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Total value of successfully completed transactions.
          </p>
        </div>
      </section>

      {/* =================================================
          RECENT TRANSACTIONS
      ================================================= */}

      <section className="overflow-hidden rounded-[24px] border border-[#e7edf7] bg-white shadow-[0_3px_14px_rgba(16,38,77,0.035)]">
        <div className="p-5 sm:p-6">
          <SectionTitle
            title="Recent Transactions"
            subtitle="The latest transactions recorded on eVault."
            href="/transactions"
            linkText="All transactions"
          />
        </div>

        {loading ? (
          <div className="space-y-4 px-6 pb-6">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-14 w-full" />
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <EmptyState message="No recent transactions available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#f7f9fd] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((item, index) => (
                  <tr
                    key={
                      item.id ||
                      item.reference ||
                      `transaction-${index}`
                    }
                    className="transition hover:bg-[#f8faff]"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-xs font-bold text-[#2a5fd3]">
                        {item.reference || "—"}
                      </span>
                    </td>

                    <td className="min-w-[180px] px-6 py-4">
                      <p className="text-xs font-bold text-[#142747]">
                        {item.full_name ||
                          item.username ||
                          "Customer"}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {item.phone_number || "—"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {item.type || "—"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-xs font-extrabold text-[#142747]">
                        {moneyFormat(item.amount)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-[11px] text-slate-500">
                      {dateFormat(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =================================================
          RECENT CUSTOMERS
      ================================================= */}

      <section className="overflow-hidden rounded-[24px] border border-[#e7edf7] bg-white shadow-[0_3px_14px_rgba(16,38,77,0.035)]">
        <div className="p-5 sm:p-6">
          <SectionTitle
            title="Recently Registered Customers"
            subtitle="The latest customers who joined eVault."
            href="/users"
            linkText="All customers"
          />
        </div>

        {loading ? (
          <div className="space-y-4 px-6 pb-6">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        ) : recentUsers.length === 0 ? (
          <EmptyState message="No recent customers available." />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentUsers.map((user, index) => {
              const name =
                user.full_name || user.username || "Customer";

              return (
                <div
                  key={user.id || `customer-${index}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#f8faff] sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e0eaff] bg-[#edf3ff] text-sm font-extrabold text-[#2a5fd3]">
                      {name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-[#142747] sm:text-sm">
                        {name}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        {user.email || user.phone_number || "—"}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Joined {dateFormat(user.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={user.status} />
                    <Link
                      href="/users"
                      className="hidden rounded-lg border border-[#e0eaff] bg-[#f4f7ff] px-3 py-2 text-[10px] font-bold text-[#2a5fd3] transition hover:bg-[#eaf0ff] sm:inline-flex"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =================================================
          TRANSACTION TYPE BREAKDOWN
      ================================================= */}

      <section className="rounded-[24px] border border-[#e7edf7] bg-white p-5 shadow-[0_3px_14px_rgba(16,38,77,0.035)] sm:p-6">
        <SectionTitle
          title="Transaction Breakdown"
          subtitle="Transaction activity grouped by transaction type."
          href="/transactions"
          linkText="Explore transactions"
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-36 w-full" />
            ))}
          </div>
        ) : transactionTypes.length === 0 ? (
          <EmptyState message="No transaction breakdown available." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transactionTypes.map((item) => (
              <div
                key={item.type}
                className="group rounded-2xl border border-[#e7edf7] bg-[#fbfcff] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#cbdcff] hover:bg-white hover:shadow-[0_10px_25px_rgba(42,95,211,0.07)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    {item.type}
                  </span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf3ff] text-sm font-extrabold text-[#2a5fd3]">
                    ⇄
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold tracking-tight text-[#142747]">
                  {numberFormat(item.count)}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Recorded transactions
                </p>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-semibold text-slate-500">
                    Transaction volume
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-[#2a5fd3]">
                    {moneyFormat(item.volume)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="flex flex-col justify-between gap-3 border-t border-[#e5ebf5] pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#edf3ff] text-xs font-black text-[#2a5fd3]">
            e
          </span>

          <span>
            © {new Date().getFullYear()} eVault Administration Portal.
          </span>
        </div>

        <p className="font-medium">
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString("en-NG")}`
            : "Dashboard not yet updated"}
        </p>
      </footer>
    </main>
  );
}
