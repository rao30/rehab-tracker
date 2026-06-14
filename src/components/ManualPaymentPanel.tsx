"use client";

import { useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ManualPaymentPanelProps {
  unitMilestoneId: string;
  milestoneName: string;
  amount: number;
  onUpdate: () => void;
}

export function ManualPaymentPanel({
  unitMilestoneId,
  milestoneName,
  amount,
  onUpdate,
}: ManualPaymentPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState("Zelle");
  const [paymentReference, setPaymentReference] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleManualPay() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/draws", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitMilestoneId,
        action: "manual_pay",
        paymentMethod,
        paymentReference,
        ownerNotes: ownerNotes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to record payment");
      setLoading(false);
      return;
    }

    setLoading(false);
    onUpdate();
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Record payment manually</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Mark {milestoneName} as paid without a contractor draw request
          </p>
        </div>
        <p className="text-lg font-semibold text-brand-700">{formatCurrency(amount)}</p>
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="Zelle">Zelle</option>
            <option value="Venmo">Venmo</option>
            <option value="Check">Check</option>
            <option value="Wire">Wire Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="text"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Confirmation # or memo"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={ownerNotes}
          onChange={(e) => setOwnerNotes(e.target.value)}
          placeholder="Notes (optional)..."
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleManualPay}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          Mark as paid & unlock next milestone
        </button>
      </div>
    </div>
  );
}
