
"use client";

/**
 * =========================================================
 * EVAULT ADMIN STATISTICS CARD
 * =========================================================
 */

const accents = {
  blue: {
    badge: "bg-blue-50 text-blue-700",
    icon: "bg-blue-50 text-blue-600",
    border: "border-slate-200",
  },

  green: {
    badge: "bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-50 text-emerald-600",
    border: "border-slate-200",
  },

  amber: {
    badge: "bg-amber-50 text-amber-700",
    icon: "bg-amber-50 text-amber-600",
    border: "border-slate-200",
  },

  red: {
    badge: "bg-red-50 text-red-700",
    icon: "bg-red-50 text-red-600",
    border: "border-slate-200",
  },

  slate: {
    badge: "bg-slate-100 text-slate-700",
    icon: "bg-slate-100 text-slate-600",
    border: "border-slate-200",
  },
};

export default function StatCard({
  label,
  value = 0,
  hint,
  accent = "blue",
  icon,
  loading = false,
}) {
  const style = accents[accent] || accents.blue;

  return (
    <div
      className={`rounded-2xl border ${style.border} bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <span
          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}
        >
          eVault
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {loading ? (
          <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="break-words text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        )}

        {icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${style.icon}`}
          >
            {icon}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-2 text-xs text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
