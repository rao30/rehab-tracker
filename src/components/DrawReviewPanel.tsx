"use client";

import { useState } from "react";
import { Check, X, DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface DrawReviewPanelProps {
  draw: {
    id: string;
    status: string;
    amount: number | string;
    contractorNotes?: string | null;
    ownerNotes?: string | null;
    photos: { id: string; filename: string }[];
    requester: { name: string };
  };
  onUpdate: () => void;
}

export function DrawReviewPanel({ draw, onUpdate }: DrawReviewPanelProps) {
  const [ownerNotes, setOwnerNotes] = useState(draw.ownerNotes || "");
  const [paymentMethod, setPaymentMethod] = useState("Zelle");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string) {
    setLoading(true);
    await fetch("/api/draws", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drawId: draw.id,
        action,
        ownerNotes,
        paymentMethod,
        paymentReference,
      }),
    });
    setLoading(false);
    onUpdate();
  }

  if (draw.status === "PAID") {
    return (
      <div className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
        Payment recorded for {formatCurrency(Number(draw.amount))}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Draw request from {draw.requester.name}
          </p>
          <p className="text-lg font-semibold text-brand-700">
            {formatCurrency(Number(draw.amount))}
          </p>
        </div>
        <StatusBadge status={draw.status} />
      </div>

      {draw.contractorNotes && (
        <p className="mt-3 text-sm text-slate-700">{draw.contractorNotes}</p>
      )}

      {draw.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {draw.photos.map((photo) => (
            <a
              key={photo.id}
              href={`/api/files/photos/${photo.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/photos/${photo.filename}`}
                alt="Completed work"
                className="h-full w-full object-cover hover:scale-105 transition-transform"
              />
            </a>
          ))}
        </div>
      )}

      {draw.status === "SUBMITTED" && (
        <>
          <textarea
            value={ownerNotes}
            onChange={(e) => setOwnerNotes(e.target.value)}
            placeholder="Notes for contractor (optional)..."
            rows={2}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleAction("approve")}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
          </div>
        </>
      )}

      {draw.status === "APPROVED" && (
        <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
          <p className="text-sm font-medium text-slate-900">Record payment</p>
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
          <button
            onClick={() => handleAction("pay")}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Mark as paid & unlock next milestone
          </button>
        </div>
      )}
    </div>
  );
}
