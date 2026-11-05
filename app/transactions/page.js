
"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedLayout from "../../components/ProtectedLayout";
import api from "../../lib/api";

// =========================================================
// FORMATTERS
// =========================================================

function currency(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function numberFormat(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

function dateText(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusPill({ status }) {
  const value = String(status || "UNKNOWN").toUpperCase();

  const styles = {
    SUCCESS: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    SUCCESSFUL: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    PROCESSING: "bg-blue-50 text-blue-700 ring-blue-100",
    FAILED: "bg-red-50 text-red-700 ring-red-100",
    REVERSED: "bg-slate-100 text-slate-700 ring-slate-200",
    REFUNDED: "bg-purple-50 text-purple-700 ring-purple-100",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        styles[value] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {value}
    </span>
  );
}

// =========================================================
// SECTION HEADER
// =========================================================

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

// =========================================================
// STATISTICS CARD
// =========================================================

function TransactionStat({
  label,
  value,
  icon,
  description,
  color = "blue",
  loading,
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${colors[color]}`}
        >
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="mt-5 h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <p className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
          {numberFormat(value)}
        </p>
      )}

      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================

function EmptyState({ message }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
        ⇄
      </div>

      <h3 className="font-bold text-slate-700">
        No transactions found
      </h3>

      <p className="mt-1 text-sm text-slate-400">{message}</p>
    </div>
  );
}

// =========================================================
// DETAIL ROW
// =========================================================

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col justify-between gap-1 border-b border-slate-100 py-3 sm:flex-row sm:gap-5">
      <span className="shrink-0 text-xs font-medium text-slate-500">
        {label}
      </span>

      <span className="break-all text-xs font-semibold text-right text-slate-800">
        {value === undefined || value === null || value === ""
          ? "—"
          : String(value)}
      </span>
    </div>
  );
}

// =========================================================
// MAIN TRANSACTIONS CONTENT
// =========================================================

function TransactionsContent() {
  const [items, setItems] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
  });

  const [summary, setSummary] = useState(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Loading and errors
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Details modal
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // =======================================================
  // LOAD OVERALL TRANSACTION STATISTICS
  // Reuses the already verified dashboard endpoint.
  // =======================================================

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);

      const response = await api.get("/admin/dashboard");

      if (response?.data?.success) {
        setSummary(response.data.data || null);
      }
    } catch (err) {
      console.error(
        "Unable to load transaction summary:",
        err?.response?.data || err.message
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // =======================================================
  // LOAD TRANSACTION RECORDS
  // =======================================================

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (type) params.set("type", type);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const response = await api.get(
          `/admin/transactions?${params.toString()}`
        );

        if (!active) return;

        if (response?.data?.success === false) {
          throw new Error(
            response?.data?.message || "Unable to load transactions."
          );
        }

        setItems(response?.data?.data || []);

        setPagination(
          response?.data?.pagination || {
            page,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load transactions."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTransactions();

    return () => {
      active = false;
    };
  }, [
    page,
    search,
    status,
    type,
    dateFrom,
    dateTo,
    refreshKey,
  ]);

  // =======================================================
  // SEARCH
  // =======================================================

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  // =======================================================
  // TRANSACTION DETAILS
  // =======================================================

  async function openDetails(identifier) {
    if (!identifier) return;

    try {
      setSelected(null);
      setDetailError("");
      setDetailLoading(true);

      const response = await api.get(
        `/admin/transactions/${encodeURIComponent(identifier)}`
      );

      setSelected(response?.data?.data || null);

      if (!response?.data?.data) {
        throw new Error("Transaction details were not returned.");
      }
    } catch (err) {
      setDetailError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load transaction details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  // =======================================================
  // DASHBOARD STATISTICS
  // =======================================================

  const transactionStats = summary?.transactions || {};

  const statistics = [
    {
      label: "Total Transactions",
      value: transactionStats.totalTransactions,
      icon: "⇄",
      description: "All recorded transactions",
      color: "blue",
    },
    {
      label: "Successful",
      value: transactionStats.successfulTransactions,
      icon: "✓",
      description: "Successfully completed",
      color: "green",
    },
    {
      label: "Pending",
      value: transactionStats.pendingTransactions,
      icon: "◷",
      description: "Awaiting completion",
      color: "amber",
    },
    {
      label: "Failed",
      value: transactionStats.failedTransactions,
      icon: "!",
      description: "Unsuccessful transactions",
      color: "red",
    },
    {
      label: "Reversed",
      value: transactionStats.reversedTransactions,
      icon: "↶",
      description: "Reversed transactions",
      color: "slate",
    },
  ];

  const transactionTypes = Array.isArray(summary?.transactionTypes)
    ? summary.transactionTypes
    : [];

  const hasNextPage =
    pagination.hasNextPage !== undefined
      ? pagination.hasNextPage
      : page < Number(pagination.totalPages || 0);

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-8 pb-10">

      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            <span className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-600">
              Financial Management
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Transactions
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor, search and inspect transactions across all eVault customer wallets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshKey((value) => value + 1);
            loadSummary();
          }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          <span className="text-lg">↻</span>
          {loading ? "Refreshing..." : "Refresh Records"}
        </button>
      </div>

      {/* TRANSACTION STATISTICS */}

      <section>
        <SectionTitle
          title="Transaction Overview"
          subtitle="Real-time transaction statistics from your eVault database."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statistics.map((item) => (
            <TransactionStat
              key={item.label}
              {...item}
              loading={summaryLoading}
            />
          ))}
        </div>
      </section>

      {/* SUCCESSFUL TRANSACTION VOLUME */}

      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-800 via-blue-700 to-blue-500 p-6 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-100">
              Successful Transaction Volume
            </p>

            <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {summaryLoading
                ? "Loading..."
                : currency(
                    transactionStats.successfulTransactionVolume
                  )}
            </p>

            <p className="mt-2 text-xs text-blue-100">
              Total value of successfully completed transactions
            </p>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl font-bold">
            ₦
          </div>
        </div>
      </section>

      {/* TRANSACTION TYPE BREAKDOWN */}

      {transactionTypes.length > 0 && (
        <section>
          <SectionTitle
            title="Transaction Categories"
            subtitle="Activity and volume by transaction type."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transactionTypes.map((item) => (
              <div
                key={item.type}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {item.type}
                  </p>

                  <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                    {numberFormat(item.count)} records
                  </span>
                </div>

                <p className="mt-5 text-2xl font-extrabold text-slate-900">
                  {currency(item.volume)}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Transaction volume
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEARCH AND FILTERS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionTitle
          title="Find Transactions"
          subtitle="Search using a reference, customer details or transaction description."
          action={
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              {numberFormat(pagination.total)} records
            </span>
          }
        />

        <form onSubmit={applySearch} className="space-y-4">

          {/* SEARCH INPUT */}

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              ⌕
            </span>

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search reference, customer, email, phone or description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {/* FILTERS */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Transaction Status
              </label>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All statuses</option>
                <option value="SUCCESS">Successful</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Transaction Type
              </label>

              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All transaction types</option>
                <option value="FUNDING">Funding</option>
                <option value="PAYMENT">Payment</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                From Date
              </label>

              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                To Date
              </label>

              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Search Transactions
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </form>
      </section>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="font-bold text-red-700">
            Unable to load transactions
          </p>

          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* TRANSACTIONS TABLE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5 sm:p-6">
          <SectionTitle
            title="Transaction Records"
            subtitle="Detailed financial activity across eVault."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">

            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-bold">Reference</th>
                <th className="px-5 py-4 font-bold">Customer</th>
                <th className="px-5 py-4 font-bold">Type</th>
                <th className="px-5 py-4 font-bold">Amount</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold">Date</th>
                <th className="px-5 py-4 text-right font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (
                [1, 2, 3, 4].map((item) => (
                  <tr key={item}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-7 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-blue-50/40"
                  >

                    <td className="px-5 py-4">
                      <p className="max-w-[210px] truncate font-bold text-slate-800">
                        {item.reference || item.id}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {item.wallet_number || "eVault transaction"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">
                          {(item.full_name || item.username || "C")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[180px] truncate font-semibold text-slate-800">
                            {item.full_name ||
                              item.username ||
                              "Unknown customer"}
                          </p>

                          <p className="max-w-[180px] truncate text-xs text-slate-400">
                            {item.email || item.phone_number || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                        {item.type || "—"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-extrabold text-slate-900">
                      {currency(item.amount)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusPill status={item.status} />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {dateText(item.created_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          openDetails(item.id || item.reference)
                        }
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                      >
                        View Details
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="There are no transactions matching your search or filters." />
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">

          <p className="text-xs text-slate-500">
            Showing page{" "}
            <strong className="text-slate-800">{page}</strong>
            {" "}of{" "}
            <strong className="text-slate-800">
              {Math.max(Number(pagination.totalPages || 0), 1)}
            </strong>
            {" "}·{" "}
            <strong className="text-slate-800">
              {numberFormat(pagination.total)}
            </strong>
            {" "}total records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() =>
                setPage((value) => Math.max(1, value - 1))
              }
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={!hasNextPage || loading}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

      </section>

      {/* TRANSACTION DETAILS MODAL */}

      {(detailLoading || selected || detailError) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
              setDetailError("");
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">

            {/* MODAL HEADER */}

            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Financial Records
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                  Transaction Details
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setDetailError("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* DETAIL LOADING */}

            {detailLoading && (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                <p className="text-sm text-slate-500">
                  Loading transaction details...
                </p>
              </div>
            )}

            {/* DETAIL ERROR */}

            {!detailLoading && detailError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="font-semibold text-red-700">
                  Unable to retrieve transaction
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {detailError}
                </p>
              </div>
            )}

            {/* DETAIL CONTENT */}

            {!detailLoading && selected && (
              <div className="space-y-5">

                <div className="rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-blue-100">
                      Transaction Amount
                    </p>

                    <StatusPill status={selected.status} />
                  </div>

                  <p className="mt-4 text-3xl font-extrabold">
                    {currency(selected.amount)}
                  </p>

                  <p className="mt-2 break-all text-xs text-blue-100">
                    {selected.reference || selected.id}
                  </p>
                </div>

                {/* CUSTOMER DETAILS */}

                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-900">
                    Customer Information
                  </h3>

                  <div className="rounded-xl border border-slate-200 px-4">
                    <DetailRow
                      label="Full name"
                      value={selected.full_name || selected.username}
                    />

                    <DetailRow
                      label="Email"
                      value={selected.email}
                    />

                    <DetailRow
                      label="Phone number"
                      value={selected.phone_number}
                    />

                    <DetailRow
                      label="Customer ID"
                      value={selected.user_id}
                    />
                  </div>
                </div>

                {/* TRANSACTION INFORMATION */}

                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-900">
                    Transaction Information
                  </h3>

                  <div className="rounded-xl border border-slate-200 px-4">
                    <DetailRow
                      label="Reference"
                      value={selected.reference}
                    />

                    <DetailRow
                      label="Transaction ID"
                      value={selected.id}
                    />

                    <DetailRow
                      label="Transaction type"
                      value={selected.type}
                    />

                    <DetailRow
                      label="Status"
                      value={selected.status}
                    />

                    <DetailRow
                      label="Description"
                      value={selected.description}
                    />

                    <DetailRow
                      label="Date"
                      value={dateText(selected.created_at)}
                    />
                  </div>
                </div>

                {/* WALLET INFORMATION */}

                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-900">
                    Wallet Ledger Information
                  </h3>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Balance Before
                      </p>

                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {currency(selected.balance_before)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600">
                        Balance After
                      </p>

                      <p className="mt-2 text-xl font-extrabold text-emerald-800">
                        {currency(selected.balance_after)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* METADATA */}

                {selected.metadata && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-900">
                      Additional Information
                    </h3>

                    <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 text-[11px] leading-relaxed text-emerald-300">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setDetailError("");
              }}
              className="mt-6 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>

          </div>
        </div>
      )}

      {/* FOOTER */}

      <footer className="border-t border-slate-200 pt-5 text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} eVault Administration Portal.
          Secure financial transaction management.
        </p>
      </footer>

    </div>
  );
}

// =========================================================
// PROTECTED PAGE
// =========================================================

export default function TransactionsPage() {
  return (
    <ProtectedLayout>
      <TransactionsContent />
    </ProtectedLayout>
  );
}
