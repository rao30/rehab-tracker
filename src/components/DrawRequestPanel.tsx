"use client";

import { useEffect, useState } from "react";
import { Camera, Send, Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

const MAX_PHOTOS = 12;
const MAX_FILE_SIZE_MB = 15;

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

interface PhotoPreview {
  file: File;
  url: string;
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
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const existingCount = existingDraw?.photos.length ?? 0;
  const remainingSlots = MAX_PHOTOS - existingCount;

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [photos]);

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

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");

    const next: PhotoPreview[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`Each photo must be under ${MAX_FILE_SIZE_MB} MB`);
        continue;
      }
      if (photos.length + next.length >= remainingSlots) {
        setError(`Maximum ${MAX_PHOTOS} photos per draw request`);
        break;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }

    if (next.length) setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function submitDraw(submit: boolean) {
    if (submit && photos.length === 0 && existingCount === 0) {
      setError("Add at least one photo of the completed work");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("unitMilestoneId", unitMilestoneId);
    formData.append("contractorNotes", notes);
    formData.append("submit", String(submit));
    photos.forEach((p) => formData.append("photos", p.file));

    try {
      const res = await fetch("/api/draws", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit");
        return;
      }
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
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

      <label
        className={`mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50/30 ${
          remainingSlots <= 0 ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <Camera className="h-4 w-4" />
        <span>
          Add photos of completed work
          {remainingSlots > 0 && (
            <span className="text-slate-400"> ({remainingSlots} remaining)</span>
          )}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={remainingSlots <= 0}
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <p className="mt-1 text-xs text-slate-400">
        Photos are automatically compressed to save storage. Up to {MAX_PHOTOS} images,{" "}
        {MAX_FILE_SIZE_MB} MB each.
      </p>

      {(photos.length > 0 || existingDraw?.photos.length) ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {existingDraw?.photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/photos/${photo.filename}`}
                alt={photo.caption || "Work photo"}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          {photos.map((photo, index) => (
            <div key={photo.url} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

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
