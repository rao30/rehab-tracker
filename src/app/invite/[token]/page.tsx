"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Loader2, Hammer } from "lucide-react";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [invite, setInvite] = useState<{ email: string; projectName: string } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvite(data);
        }
        setLoading(false);
      });
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/invite/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to accept invite");
      setSubmitting(false);
      return;
    }

    router.push(`/projects/${data.projectId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={null} />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <Hammer className="h-7 w-7" />
          </div>

          {error && !invite ? (
            <>
              <h1 className="mt-6 text-xl font-bold text-slate-900">Invalid invite</h1>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm font-medium text-brand-600"
              >
                Sign in instead
              </Link>
            </>
          ) : invite ? (
            <>
              <h1 className="mt-6 text-xl font-bold text-slate-900">You&apos;re invited!</h1>
              <p className="mt-2 text-sm text-slate-600">
                Join <strong>{invite.projectName}</strong> as contractor
              </p>
              <p className="mt-1 text-xs text-slate-500">{invite.email}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Password {invite ? "(create or enter existing)" : ""}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Accept & join project
                </button>
              </form>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
