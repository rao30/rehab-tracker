"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";

export function ContractUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    projectName: string;
    milestones: number;
    units: number;
    totalBudget: number;
    parsingMethod: string;
    confidence: string;
  } | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("contract", file);

    try {
      const res = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setPreview({
        projectName: data.parsed.projectName,
        milestones: data.parsed.milestones.length,
        units: data.parsed.units.length,
        totalBudget: data.parsed.totalBudget,
        parsingMethod: data.parsed.parsingMethod,
        confidence: data.parsed.confidence,
      });

      setTimeout(() => {
        router.push(`/projects/${data.project.id}`);
        router.refresh();
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Upload your contract</h2>
        <p className="mt-1 text-sm text-slate-600">
          Drop your PDF contract and we&apos;ll automatically build your payment milestone
          checklist — no manual data entry.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <label
          htmlFor="contract-upload"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            file
              ? "border-brand-300 bg-brand-50/50"
              : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
          }`}
        >
          <input
            id="contract-upload"
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <>
              <FileText className="h-10 w-10 text-brand-600" />
              <p className="mt-3 text-sm font-medium text-slate-900">{file.name}</p>
              <p className="mt-1 text-xs text-slate-500">Click to change file</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Drop contract PDF here or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-500">PDF or plain text</p>
            </>
          )}
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {preview && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Checklist generated!</span>
            </div>
            <p className="mt-2 text-sm text-emerald-700">
              {preview.projectName} — {preview.milestones} milestones across{" "}
              {preview.units} unit(s). Redirecting...
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing contract...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate payment checklist
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Powered by Gemini AI for contract comprehension, with rule-based fallback.
        </p>
      </form>
    </div>
  );
}
