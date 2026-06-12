"use client";

import { useState } from "react";
import { Copy, Check, UserPlus } from "lucide-react";

export function InviteContractor({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/projects/${projectId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create invite");
      setLoading(false);
      return;
    }

    setInviteUrl(data.inviteUrl);
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-brand-600" />
        <h3 className="font-semibold text-slate-900">Invite your contractor</h3>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Send Jesse (or any contractor) a link to join this project and submit draw requests.
      </p>

      <form onSubmit={sendInvite} className="mt-4 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contractor@email.com"
          required
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Create invite
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {inviteUrl && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Invite link</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate text-xs text-slate-700">{inviteUrl}</code>
            <button
              onClick={copyLink}
              className="shrink-0 rounded-md p-2 hover:bg-slate-200 transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
