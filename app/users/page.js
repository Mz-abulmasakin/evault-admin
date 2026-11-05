
"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedLayout from "../../components/ProtectedLayout";
import api from "../../lib/api";

const PAGE_SIZE = 20;

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
  DISABLED: "bg-red-50 text-red-700 border-red-200",
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
};

function formatCurrency(value) {
  if (value === undefined || value === null) return "—";

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

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function numberFormat(value) {
  return Number(value || 0).toLocaleString("en-NG");
}

function getInitials(name) {
  return String(name || "Customer")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function validAmount(value) {
  const raw = String(value ?? "").trim();

  return /^\d+(\.\d{1,2})?$/.test(raw) &&
    Number.isFinite(Number(raw)) &&
    Number(raw) > 0;
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({ status }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        STATUS_STYLES[normalized] ||
        "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {normalized}
    </span>
  );
}

// =========================================================
// VERIFICATION BADGE
// =========================================================

function VerificationBadge({ verified, label }) {
  const isVerified = verified === true;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
        isVerified
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isVerified ? "✓" : "○"} {label}
    </span>
  );
}

// =========================================================
// LOADING
// =========================================================

function LoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-14 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

// =========================================================
// SECTION HEADER
// =========================================================

function SectionHeading({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-slate-900">{title}</h3>

      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}

// =========================================================
// CUSTOMER PROFILE MODAL
// =========================================================

function CustomerDetailsModal({
  user,
  loading,
  error,
  onClose,
  onRefresh,
  onFund,
  onDeduct,
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
  });

  // MANUAL FUNDING STATE
  const [fundingAmount, setFundingAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState("");
  const [fundSuccess, setFundSuccess] = useState("");

  // MANUAL DEDUCTION STATE
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState("");
  const [deductSuccess, setDeductSuccess] = useState("");

  const busy = saving || funding || deducting;

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.full_name || "",
        email: user.email || "",
        phoneNumber: user.phone_number || "",
      });
    }

    setEditing(false);
    setSaving(false);
    setSaveError("");

    setFundingAmount("");
    setFunding(false);
    setFundError("");
    setFundSuccess("");

    setDeductionAmount("");
    setDeductionReason("");
    setDeducting(false);
    setDeductError("");
    setDeductSuccess("");
  }, [
    user?.id,
    user?.full_name,
    user?.email,
    user?.phone_number,
  ]);

  // -------------------------------------------------------
  // UPDATE CUSTOMER
  // -------------------------------------------------------

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setSaveError("");

    try {
      const response = await api.patch(
        `/admin/users/${encodeURIComponent(user.id)}`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
        }
      );

      const updatedUser = response?.data?.data;

      if (!updatedUser) {
        throw new Error(
          "The server did not return the updated customer."
        );
      }

      setEditing(false);
      await onRefresh(updatedUser);
    } catch (err) {
      setSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update customer information."
      );
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------
  // MANUAL WALLET FUNDING
  // -------------------------------------------------------

  async function handleManualFunding(event) {
    event.preventDefault();

    setFundError("");
    setFundSuccess("");

    if (!validAmount(fundingAmount)) {
      setFundError(
        "Enter a valid funding amount with no more than two decimal places."
      );
      return;
    }

    const amount = Number(fundingAmount);

    const confirmed = window.confirm(
      `Confirm manual funding of ${formatCurrency(amount)} to ${user.full_name || "this customer"}?`
    );

    if (!confirmed) return;

    setFunding(true);

    try {
      const result = await onFund(user.id, amount);

      setFundingAmount("");

      setFundSuccess(
        result?.message ||
          "Customer wallet funded successfully."
      );
    } catch (err) {
      setFundError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to process manual funding."
      );
    } finally {
      setFunding(false);
    }
  }

  // -------------------------------------------------------
  // MANUAL WALLET DEDUCTION
  // -------------------------------------------------------

  async function handleManualDeduction(event) {
    event.preventDefault();

    setDeductError("");
    setDeductSuccess("");

    if (!validAmount(deductionAmount)) {
      setDeductError(
        "Enter a valid deduction amount with no more than two decimal places."
      );
      return;
    }

    const reason = deductionReason.trim();

    if (reason.length < 3) {
      setDeductError(
        "Please provide a reason of at least three characters."
      );
      return;
    }

    if (reason.length > 250) {
      setDeductError(
        "The deduction reason cannot exceed 250 characters."
      );
      return;
    }

    const amount = Number(deductionAmount);

    const confirmed = window.confirm(
      `WARNING: You are about to deduct ${formatCurrency(amount)} from ${user.full_name || "this customer"}'s wallet.\n\nReason: ${reason}\n\nDo you want to continue?`
    );

    if (!confirmed) return;

    setDeducting(true);

    try {
      const result = await onDeduct(
        user.id,
        amount,
        reason
      );

      setDeductionAmount("");
      setDeductionReason("");

      setDeductSuccess(
        result?.message ||
          "Customer wallet deducted successfully."
      );
    } catch (err) {
      setDeductError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to process wallet deduction."
      );
    } finally {
      setDeducting(false);
    }
  }

  if (!loading && !user && !error) return null;

  const availableBalance =
    user?.available_balance ??
    user?.wallet?.available_balance;

  const ledgerBalance =
    user?.ledger_balance ??
    user?.wallet?.ledger_balance;

  const walletNumber =
    user?.wallet_number ||
    user?.wallet?.wallet_number ||
    "No wallet";

  const transactions = user?.recent_transactions || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-details-title"
        className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
              Customer Management
            </p>

            <h2
              id="customer-details-title"
              className="mt-1 text-lg font-bold text-slate-900"
            >
              Customer Profile
            </h2>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Close ✕
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading customer profile...
          </div>
        ) : error ? (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : user ? (
          <div className="space-y-7 p-5 sm:p-7">

            {/* CUSTOMER IDENTITY */}

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
                  {getInitials(user.full_name)}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    {user.full_name || "Customer"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    @{user.username} · Customer ID: {user.id}
                  </p>

                  <div className="mt-2">
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      fullName: user.full_name || "",
                      email: user.email || "",
                      phoneNumber: user.phone_number || "",
                    });
                    setSaveError("");
                    setEditing(true);
                  }}
                  className="w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Edit Customer
                </button>
              )}
            </div>

            {/* EDIT CUSTOMER */}

            {editing && (
              <form
                onSubmit={handleSave}
                className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-5"
              >
                <h3 className="font-bold text-slate-900">
                  Edit Customer Information
                </h3>

                {saveError && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {saveError}
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Full name
                    </span>

                    <input
                      required
                      maxLength={150}
                      value={form.fullName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          fullName: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Email address
                    </span>

                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Phone number
                    </span>

                    <input
                      type="tel"
                      required
                      maxLength={20}
                      value={form.phoneNumber}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phoneNumber: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <p className="text-xs text-slate-500">
                  Username, password, transaction PIN and verification
                  records cannot be changed here.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={saving}
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false);
                      setSaveError("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {!editing && (
              <>
                {/* CUSTOMER INFORMATION */}

                <section>
                  <SectionHeading
                    title="Customer Information"
                    description="Contact and account verification details."
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">
                        Email address
                      </p>

                      <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                        {user.email || "—"}
                      </p>

                      <div className="mt-2">
                        <VerificationBadge
                          verified={
                            user.email_verified ??
                            user.is_email_verified
                          }
                          label="Email"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">
                        Phone number
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {user.phone_number || "—"}
                      </p>

                      <div className="mt-2">
                        <VerificationBadge
                          verified={
                            user.phone_verified ??
                            user.is_phone_verified
                          }
                          label="Phone"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">
                        Wallet number
                      </p>

                      <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                        {walletNumber}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">
                        Registered
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* WALLET OVERVIEW */}

                <section>
                  <SectionHeading
                    title="Wallet Overview"
                    description="Current customer wallet balances. These values refresh after each successful manual transaction."
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gradient-to-br from-blue-800 to-blue-600 p-5 text-white">
                      <p className="text-xs font-medium text-blue-100">
                        Available Balance
                      </p>

                      <p className="mt-3 text-2xl font-extrabold">
                        {formatCurrency(availableBalance)}
                      </p>

                      <p className="mt-2 text-[10px] text-blue-100">
                        Funds currently available in the wallet
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-5">
                      <p className="text-xs font-medium text-slate-500">
                        Ledger Balance
                      </p>

                      <p className="mt-3 text-2xl font-extrabold text-slate-900">
                        {formatCurrency(ledgerBalance)}
                      </p>

                      <p className="mt-2 text-[10px] text-slate-500">
                        Customer wallet ledger balance
                      </p>
                    </div>
                  </div>
                </section>

                {/* MANUAL WALLET OPERATIONS */}

                <section>
                  <SectionHeading
                    title="Wallet Operations"
                    description="Perform an authorized manual credit or deduction on this customer's wallet."
                  />

                  <div className="grid gap-5 lg:grid-cols-2">

                    {/* MANUAL FUNDING */}

                    <div className="overflow-hidden rounded-2xl border border-blue-200">
                      <div className="flex items-center gap-3 bg-blue-50 px-5 py-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
                          +
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Manual Wallet Funding
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            Credit the customer's wallet.
                          </p>
                        </div>
                      </div>

                      <form
                        onSubmit={handleManualFunding}
                        className="space-y-4 p-5"
                      >
                        {fundSuccess && (
                          <div
                            role="status"
                            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                          >
                            <p className="font-bold">
                              Funding successful
                            </p>
                            <p className="mt-1">{fundSuccess}</p>
                          </div>
                        )}

                        {fundError && (
                          <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                          >
                            {fundError}
                          </div>
                        )}

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Funding amount (NGN)
                          </span>

                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                              ₦
                            </span>

                            <input
                              type="number"
                              required
                              min="0.01"
                              step="0.01"
                              max="100000000"
                              value={fundingAmount}
                              onChange={(event) => {
                                setFundingAmount(event.target.value);
                                setFundError("");
                                setFundSuccess("");
                              }}
                              placeholder="0.00"
                              disabled={busy}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                            />
                          </div>
                        </label>

                        <div className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                          This operation credits both available and ledger
                          balances and records a successful FUNDING
                          transaction.
                        </div>

                        <button
                          type="submit"
                          disabled={busy || !fundingAmount}
                          className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {funding
                            ? "Processing Funding..."
                            : "Credit Customer Wallet"}
                        </button>
                      </form>
                    </div>

                    {/* MANUAL DEDUCTION */}

                    <div className="overflow-hidden rounded-2xl border border-red-200">
                      <div className="flex items-center gap-3 bg-red-50 px-5 py-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-xl font-bold text-white">
                          −
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Manual Wallet Deduction
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            Debit the customer's wallet.
                          </p>
                        </div>
                      </div>

                      <form
                        onSubmit={handleManualDeduction}
                        className="space-y-4 p-5"
                      >
                        {deductSuccess && (
                          <div
                            role="status"
                            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                          >
                            <p className="font-bold">
                              Deduction successful
                            </p>
                            <p className="mt-1">{deductSuccess}</p>
                          </div>
                        )}

                        {deductError && (
                          <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                          >
                            {deductError}
                          </div>
                        )}

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Deduction amount (NGN)
                          </span>

                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                              ₦
                            </span>

                            <input
                              type="number"
                              required
                              min="0.01"
                              step="0.01"
                              max="100000000"
                              value={deductionAmount}
                              onChange={(event) => {
                                setDeductionAmount(event.target.value);
                                setDeductError("");
                                setDeductSuccess("");
                              }}
                              placeholder="0.00"
                              disabled={busy}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm font-semibold outline-none focus:border-red-500 focus:bg-white"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Reason for deduction
                          </span>

                          <textarea
                            required
                            minLength={3}
                            maxLength={250}
                            rows={3}
                            value={deductionReason}
                            onChange={(event) => {
                              setDeductionReason(event.target.value);
                              setDeductError("");
                              setDeductSuccess("");
                            }}
                            placeholder="Explain why this wallet is being deducted..."
                            disabled={busy}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red-500 focus:bg-white"
                          />
                          <p className="mt-1 text-right text-[10px] text-slate-400">
                            {deductionReason.length}/250
                          </p>
                        </label>

                        <div className="rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-800">
                          This operation reduces both wallet balances.
                          It will be rejected if the customer has
                          insufficient funds. The deduction reason is
                          saved in the transaction metadata.
                        </div>

                        <button
                          type="submit"
                          disabled={
                            busy ||
                            !deductionAmount ||
                            deductionReason.trim().length < 3
                          }
                          className="w-full rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deducting
                            ? "Processing Deduction..."
                            : "Deduct From Customer Wallet"}
                        </button>
                      </form>
                    </div>
                  </div>
                </section>

                {/* RECENT TRANSACTIONS */}

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">
                      Recent Transactions
                    </h3>

                    <span className="text-xs text-slate-400">
                      {transactions.length} records
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[650px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Balance After</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {transactions.length ? (
                          transactions.map((transaction) => (
                            <tr key={transaction.id || transaction.reference}>
                              <td className="px-4 py-3 font-medium text-slate-700">
                                {transaction.reference || transaction.id}
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {transaction.type}
                              </td>

                              <td
                                className={`px-4 py-3 font-semibold ${
                                  transaction.type === "PAYMENT"
                                    ? "text-red-600"
                                    : transaction.type === "FUNDING" ||
                                      transaction.type === "REFUND"
                                    ? "text-emerald-600"
                                    : "text-slate-800"
                                }`}
                              >
                                {transaction.type === "PAYMENT" ? "−" : "+"}
                                {formatCurrency(transaction.amount)}
                              </td>

                              <td className="px-4 py-3 text-slate-700">
                                {formatCurrency(transaction.balance_after)}
                              </td>

                              <td className="px-4 py-3">
                                <StatusBadge status={transaction.status} />
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                                {formatDate(transaction.created_at)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-slate-400"
                            >
                              No recent transactions found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

// =========================================================
// CUSTOMERS PAGE
// =========================================================

function CustomersContent() {
  const [customers, setCustomers] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [overview, setOverview] = useState(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  // =======================================================
  // LOAD CUSTOMER STATISTICS
  // =======================================================

  const loadOverview = useCallback(async () => {
    try {
      const response = await api.get("/admin/dashboard");

      if (response?.data?.success) {
        setOverview(response.data.data?.users || null);
      }
    } catch (error) {
      console.error(
        "Customer overview error:",
        error?.response?.data || error.message
      );
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, refreshKey]);

  // =======================================================
  // LOAD CUSTOMER LIST
  // =======================================================

  const loadCustomers = useCallback(
    async (signal) => {
      setLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (appliedSearch) {
          params.set("search", appliedSearch);
        }

        if (status) {
          params.set("status", status);
        }

        const response = await api.get(
          `/admin/users?${params.toString()}`,
          { signal }
        );

        const payload = response?.data;

        if (payload?.success === false) {
          throw new Error(
            payload.message || "Failed to retrieve customers."
          );
        }

        if (signal?.aborted) return;

        setCustomers(
          Array.isArray(payload?.data) ? payload.data : []
        );

        setPagination(
          payload?.pagination || {
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (error) {
        if (!signal?.aborted) {
          setLoadError(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to retrieve customers."
          );

          setCustomers([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, appliedSearch, status]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadCustomers(controller.signal);

    return () => controller.abort();
  }, [loadCustomers, refreshKey]);

  // =======================================================
  // OPEN CUSTOMER PROFILE
  // =======================================================

  async function openCustomer(userId) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedUser(null);

    try {
      const response = await api.get(
        `/admin/users/${encodeURIComponent(userId)}`
      );

      if (response?.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to retrieve customer."
        );
      }

      const customer = response?.data?.data;

      if (!customer) {
        throw new Error("Customer details were not returned.");
      }

      setSelectedUser(customer);
    } catch (error) {
      setDetailsError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to retrieve customer details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  // =======================================================
  // REFRESH PROFILE AFTER CUSTOMER EDIT
  // =======================================================

  async function handleCustomerUpdated(updatedUser) {
    setSelectedUser((current) => ({
      ...current,
      ...updatedUser,
    }));

    setNotice("Customer information updated successfully.");
    setRefreshKey((current) => current + 1);

    try {
      const response = await api.get(
        `/admin/users/${encodeURIComponent(updatedUser.id)}`
      );

      if (response?.data?.data) {
        setSelectedUser(response.data.data);
      }
    } catch (error) {
      console.error("Profile refresh error:", error);
    }
  }

  // =======================================================
  // APPLY UPDATED WALLET AND TRANSACTION TO PROFILE
  // =======================================================

  function applyWalletResult(userId, payload) {
    const wallet = payload?.data?.wallet;
    const transaction = payload?.data?.transaction;

    if (!wallet) return;

    setSelectedUser((current) => {
      if (!current || String(current.id) !== String(userId)) {
        return current;
      }

      const updatedTransactions = transaction
        ? [
            transaction,
            ...(current.recent_transactions || []).filter(
              (item) =>
                item.reference !== transaction.reference
            ),
          ].slice(0, 10)
        : current.recent_transactions || [];

      return {
        ...current,

        // Keep customer ID intact.
        wallet_number:
          wallet.wallet_number || current.wallet_number,

        available_balance: wallet.available_balance,
        ledger_balance: wallet.ledger_balance,

        wallet: {
          ...(current.wallet || {}),
          ...wallet,
        },

        recent_transactions: updatedTransactions,
      };
    });
  }

  // =======================================================
  // REFRESH PROFILE FROM BACKEND AFTER WALLET ACTION
  // =======================================================

  async function refreshWalletProfile(userId) {
    try {
      const response = await api.get(
        `/admin/users/${encodeURIComponent(userId)}`
      );

      if (
        response?.data?.success !== false &&
        response?.data?.data
      ) {
        setSelectedUser((current) => {
          if (
            !current ||
            String(current.id) !== String(userId)
          ) {
            return current;
          }

          return {
            ...current,
            ...response.data.data,
          };
        });
      }
    } catch (error) {
      // The wallet transaction may already have succeeded.
      // A failed profile refresh must not report that transaction as failed.
      console.error(
        "Wallet action succeeded, but profile refresh failed:",
        error?.response?.data || error.message
      );
    }
  }

  // =======================================================
  // MANUAL FUNDING
  // =======================================================

  async function handleManualFunding(userId, amount) {
    const response = await api.post(
      `/admin/users/${encodeURIComponent(userId)}/manual-funding`,
      {
        amount: String(amount),
      }
    );

    const payload = response?.data;

    if (!payload || payload.success !== true) {
      throw new Error(
        payload?.message || "Manual wallet funding failed."
      );
    }

    // Apply the returned wallet balance immediately.
    applyWalletResult(userId, payload);

    // Refresh customer directory and dashboard figures.
    setRefreshKey((current) => current + 1);

    // Fetch the complete profile, including latest transactions.
    await refreshWalletProfile(userId);

    const transaction = payload.data?.transaction;
    const reference = transaction?.reference;

    const message =
      payload.message || "Customer wallet funded successfully.";

    const successMessage = reference
      ? `${message} Reference: ${reference}`
      : message;

    setNotice(successMessage);

    return {
      message: successMessage,
      reference,
    };
  }

  // =======================================================
  // MANUAL DEDUCTION
  // =======================================================

  async function handleManualDeduction(userId, amount, reason) {
    const response = await api.post(
      `/admin/users/${encodeURIComponent(userId)}/manual-deduction`,
      {
        amount: String(amount),
        reason: reason.trim(),
      }
    );

    const payload = response?.data;

    if (!payload || payload.success !== true) {
      throw new Error(
        payload?.message || "Manual wallet deduction failed."
      );
    }

    // Apply the returned wallet balance immediately.
    applyWalletResult(userId, payload);

    // Refresh customer directory and dashboard figures.
    setRefreshKey((current) => current + 1);

    // Fetch complete profile and latest transaction history.
    await refreshWalletProfile(userId);

    const transaction = payload.data?.transaction;
    const reference = transaction?.reference;

    const message =
      payload.message || "Customer wallet deducted successfully.";

    const successMessage = reference
      ? `${message} Reference: ${reference}`
      : message;

    setNotice(successMessage);

    return {
      message: successMessage,
      reference,
    };
  }

  // =======================================================
  // SEARCH AND FILTERS
  // =======================================================

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setStatus("");
    setPage(1);
  }

  const totalPages = Math.max(
    1,
    Number(pagination.totalPages || 0)
  );

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-7 pb-10">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Customer Administration
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Customers
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage customer profiles, wallet balances, manual funding
            and deductions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshKey((current) => current + 1);
          }}
          disabled={loading}
          className="w-fit rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      {/* NOTIFICATION */}

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* CUSTOMER STATISTICS */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total customers</p>

          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {numberFormat(overview?.total ?? pagination.total)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Registered eVault customers
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active customers</p>

          <p className="mt-3 text-3xl font-extrabold text-emerald-600">
            {numberFormat(overview?.active)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Active accounts
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Suspended customers</p>

          <p className="mt-3 text-3xl font-extrabold text-amber-600">
            {numberFormat(overview?.suspended)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Suspended accounts
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Disabled customers</p>

          <p className="mt-3 text-3xl font-extrabold text-red-600">
            {numberFormat(overview?.disabled)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Disabled accounts
          </p>
        </div>
      </section>

      {/* WALLET OPERATIONS INFORMATION */}

      <section className="grid gap-4 md:grid-cols-2">

        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            +
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Manual Wallet Funding
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Credit a customer's available and ledger balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-xl font-bold text-white">
            −
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Manual Wallet Deduction
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Deduct funds with a mandatory reason and confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* SEARCH */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionHeading
          title="Find Customers"
          description="Search by customer name, username, email or phone number."
        />

        <form
          onSubmit={handleSearch}
          className="grid gap-3 md:grid-cols-[1fr_200px_auto_auto]"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DISABLED">Disabled</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Search
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        </form>
      </section>

      {/* CUSTOMER DIRECTORY */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">
              Customer Directory
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Customer records retrieved from the eVault database.
            </p>
          </div>

          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <LoadingRows />
        ) : loadError ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">
              Unable to load customers
            </p>

            <p className="mt-2 text-sm text-red-600">{loadError}</p>

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-3xl">♙</div>

            <h3 className="mt-3 font-bold text-slate-800">
              No customers found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">

              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Verification</th>
                  <th className="px-5 py-4 font-semibold">Wallet Balance</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Registered</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                          {getInitials(customer.full_name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {customer.full_name || "Customer"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            @{customer.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[210px] truncate text-xs text-slate-700">
                        {customer.email}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {customer.phone_number}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <VerificationBadge
                          verified={
                            customer.email_verified ??
                            customer.is_email_verified
                          }
                          label="Email"
                        />

                        <VerificationBadge
                          verified={
                            customer.phone_verified ??
                            customer.is_phone_verified
                          }
                          label="Phone"
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(customer.available_balance)}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {customer.wallet_number || "No wallet number"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={customer.status} />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {formatDate(customer.created_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openCustomer(customer.id)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}

        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">
            Showing {customers.length} of{" "}
            {numberFormat(pagination.total)} customers
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="px-2 text-xs font-semibold text-slate-600">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* CUSTOMER DETAILS */}

      {detailsOpen && (
        <CustomerDetailsModal
          user={selectedUser}
          loading={detailsLoading}
          error={detailsError}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedUser(null);
            setDetailsError("");
          }}
          onRefresh={handleCustomerUpdated}
          onFund={handleManualFunding}
          onDeduct={handleManualDeduction}
        />
      )}
    </div>
  );
}

// =========================================================
// PROTECTED PAGE
// =========================================================

export default function CustomersPage() {
  return (
    <ProtectedLayout>
      <CustomersContent />
    </ProtectedLayout>
  );
}
