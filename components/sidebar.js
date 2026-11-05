
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeAdminToken } from "../lib/auth";

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "▦",
  },
  {
    label: "Customers",
    href: "/users",
    icon: "♙",
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: "⇄",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    removeAdminToken();
    router.replace("/login");
  }

  function isActive(href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            e
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              eVault
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Administration
            </p>
          </div>
        </div>

        <div className="px-5 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Main menu
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                      active
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>

                  {item.label}

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-100 p-5">
          <div className="mb-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-700">
              eVault Admin Portal
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Secure administration
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <span className="text-lg">↪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* MOBILE NAVIGATION */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
              e
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                eVault Admin
              </p>
              <p className="text-[9px] uppercase tracking-wider text-slate-400">
                Administration portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-3">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
