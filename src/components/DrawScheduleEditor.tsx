"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface ScheduleMilestone {
  id: string;
  orderIndex: number;
  name: string;
  description: string;
  amountPerUnit: number | string;
  totalAmount: number | string;
  isAdvance: boolean;
}

interface EditableMilestone {
  key: string;
  id?: string;
  orderIndex: number;
  name: string;
  description: string;
  amountPerUnit: string;
  isAdvance: boolean;
  locked: boolean;
}

interface DrawScheduleEditorProps {
  projectId: string;
  milestones: ScheduleMilestone[];
  lockedMilestoneIds: string[];
  unitCount: number;
  totalBudget: number;
  onUpdate: () => void;
}

function toEditable(
  milestones: ScheduleMilestone[],
  lockedIds: Set<string>
): EditableMilestone[] {
  return milestones.map((m) => ({
    key: m.id,
    id: m.id,
    orderIndex: m.orderIndex,
    name: m.name,
    description: m.description,
    amountPerUnit: String(Number(m.amountPerUnit)),
    isAdvance: m.isAdvance,
    locked: lockedIds.has(m.id),
  }));
}

function newMilestone(orderIndex: number): EditableMilestone {
  return {
    key: `new-${Date.now()}-${Math.random()}`,
    orderIndex,
    name: "",
    description: "",
    amountPerUnit: "0",
    isAdvance: false,
    locked: false,
  };
}

export function DrawScheduleEditor({
  projectId,
  milestones,
  lockedMilestoneIds,
  unitCount,
  totalBudget,
  onUpdate,
}: DrawScheduleEditorProps) {
  const lockedIds = useMemo(
    () => new Set(lockedMilestoneIds),
    [lockedMilestoneIds]
  );

  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<EditableMilestone[]>(() =>
    toEditable(milestones, lockedIds)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const scheduleTotal = milestones.reduce(
    (sum, m) => sum + Number(m.amountPerUnit) * unitCount,
    0
  );

  const editTotal = items.reduce(
    (sum, m) => sum + (parseFloat(m.amountPerUnit) || 0) * unitCount,
    0
  );

  function startEditing() {
    setItems(toEditable(milestones, lockedIds));
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    setItems(toEditable(milestones, lockedIds));
    setError("");
    setEditing(false);
  }

  function updateItem(key: string, patch: Partial<EditableMilestone>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, orderIndex) => ({ ...item, orderIndex: orderIndex + 1 }));
    });
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.key === key);
      if (!item || item.locked) return prev;
      if (prev.length <= 1) return prev;
      return prev
        .filter((i) => i.key !== key)
        .map((i, orderIndex) => ({ ...i, orderIndex: orderIndex + 1 }));
    });
  }

  function addItem() {
    setItems((prev) => [...prev, newMilestone(prev.length + 1)]);
  }

  async function save() {
    setSaving(true);
    setError("");

    const payload = {
      milestones: items.map((item, index) => ({
        id: item.id,
        orderIndex: index + 1,
        name: item.name.trim(),
        description: item.description.trim() || item.name.trim(),
        amountPerUnit: parseFloat(item.amountPerUnit) || 0,
        isAdvance: item.isAdvance,
      })),
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save schedule");
        return;
      }

      setEditing(false);
      onUpdate();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Draw schedule</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {unitCount > 1
              ? `${milestones.length} draws × ${unitCount} units`
              : `${milestones.length} payment draws`}
            {" · "}
            {formatCurrency(scheduleTotal)} total
          </p>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="divide-y divide-slate-100">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center gap-4 px-5 py-4 sm:px-6"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {milestone.orderIndex}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{milestone.name}</p>
                  {milestone.isAdvance && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Advance
                    </span>
                  )}
                </div>
                {milestone.description && milestone.description !== milestone.name && (
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {milestone.description}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-brand-700">
                  {formatCurrency(Number(milestone.amountPerUnit))}
                </p>
                {unitCount > 1 && (
                  <p className="text-xs text-slate-500">
                    {formatCurrency(Number(milestone.totalAmount))} all units
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.key}
                className={`rounded-xl border p-4 ${
                  item.locked ? "border-slate-200 bg-slate-50/80" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-2 text-slate-400">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs font-semibold">{index + 1}</span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.key, { name: e.target.value })}
                        placeholder="Draw name"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium"
                      />
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amountPerUnit}
                          onChange={(e) =>
                            updateItem(item.key, { amountPerUnit: e.target.value })
                          }
                          disabled={item.locked}
                          placeholder="Amount per unit"
                          className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                    </div>

                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.key, { description: e.target.value })}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.isAdvance}
                          onChange={(e) =>
                            updateItem(item.key, { isAdvance: e.target.checked })
                          }
                          disabled={item.locked}
                          className="rounded border-slate-300"
                        />
                        Mobilization advance
                      </label>

                      {item.locked && (
                        <span className="text-xs text-amber-700">
                          In progress or paid — amount locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(item.key, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.key, 1)}
                      disabled={index === items.length - 1}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      disabled={item.locked || items.length <= 1}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add draw
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">
                {formatCurrency(editTotal)}
              </span>{" "}
              schedule total
              {Math.abs(editTotal - totalBudget) > 0.01 && (
                <span className="ml-2 text-amber-700">
                  (budget: {formatCurrency(totalBudget)})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
