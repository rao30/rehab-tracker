"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hammer, LogOut } from "lucide-react";

interface HeaderProps {
  user?: { name: string; role: string } | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm group-hover:bg-brand-700 transition-colors">
            <Hammer className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-slate-900">RenovateFlow</span>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-slate-600">
                {user.name}
                <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {user.role === "OWNER" ? "Owner" : "Contractor"}
                </span>
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
