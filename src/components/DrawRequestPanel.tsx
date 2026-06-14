"use client";

import { useState } from "react";
import { Camera, Send, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface DrawRequestPanelProps {
  unitMilestoneId: string;
  milestoneName: string;
  amount: number;
  status: string;
  existingDraw?: {
    id: string;
    status: string;
    contractorNotes?: string | null;
    photos: { id: string; filename: string; caption?: string | null }[];
  } | null;
  isContractor: boolean;
  onUpdate: () => void;
}

export function DrawRequestPanel({
  unitMilestoneId,
  milestoneName,
  amount,
  status,
  existingDraw,
  isContractor,
  onUpdate,
}: DrawRequestPanelProps) {
  const [notes, setNotes] = useState(existingDraw?.contractorNotes || "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isContractor || !["READY", "SUBMITTED", "REJECTED"].includes(status)) {
    if (existingDraw?.photos.length) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {existingDraw.photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/photos/${photo.filename}`}
                alt={photo.caption || "Work photo"}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  async function submitDraw(submit: boolean) {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("unitMilestoneId", unitMilestoneId);
    formData.append("contractorNotes", notes);
    formData.append("submit", String(submit));
    photos.forEach((p) => formData.append("photos", p));

    try {
      const res = await fetch("/api/draws", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }
      onUpdate();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-900">Request draw — {milestoneName}</h4>
        <span className="text-sm font-semibold text-brand-700">{formatCurrency(amount)}</span>
      </div>

      {existingDraw && (
        <div className="mt-2">
          <StatusBadge status={existingDraw.status} />
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Describe completed work for this milestone..."
        rows={3}
        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />

      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
        <Camera className="h-4 w-4" />
        <span>Add photos of completed work</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setPhotos(Array.from(e.target.files || []))}
        />
      </label>

      {photos.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">{photos.length} photo(s) selected</p>
      )}

      {existingDraw?.photos.map((photo) => (
        <div key={photo.id} className="mt-2 inline-block mr-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/photos/${photo.filename}`}
            alt=""
            className="h-16 w-16 rounded-lg object-cover"
          />
        </div>
      ))}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => submitDraw(true)}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit draw request
        </button>
      </div>
    </div>
  );
}
