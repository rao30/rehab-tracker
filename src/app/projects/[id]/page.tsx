"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { DrawRequestPanel } from "@/components/DrawRequestPanel";
import { DrawReviewPanel } from "@/components/DrawReviewPanel";
import { ManualPaymentPanel } from "@/components/ManualPaymentPanel";
import { InviteContractor } from "@/components/InviteContractor";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

interface ProjectData {
  id: string;
  name: string;
  totalBudget: number | string;
  mobilizationAdvance?: number | string | null;
  contractFile?: string | null;
  owner: { name: string; email: string };
  contractor?: { name: string; email: string } | null;
  units: {
    id: string;
    name: string;
    address?: string | null;
    budget: number | string;
    deadline?: string | null;
    unitMilestones: {
      id: string;
      status: string;
      milestone: {
        orderIndex: number;
        name: string;
        description: string;
        amountPerUnit: number | string;
      };
      drawRequests: {
        id: string;
        status: string;
        amount: number | string;
        contractorNotes?: string | null;
        ownerNotes?: string | null;
        photos: { id: string; filename: string }[];
        requester: { name: string };
        payment?: { method: string; paidAt: string } | null;
      }[];
    }[];
  }[];
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>("");

  const loadProject = useCallback(async () => {
    const [projectRes, userRes] = await Promise.all([
      fetch(`/api/projects/${params.id}`),
      fetch("/api/auth/me"),
    ]);

    if (projectRes.status === 401) {
      router.push("/login");
      return;
    }

    const projectData = await projectRes.json();
    const userData = await userRes.json();

    if (projectData.project) {
      setProject(projectData.project);
      if (!selectedUnit && projectData.project.units.length > 0) {
        setSelectedUnit(projectData.project.units[0].id);
      }
    }
    if (userData.user) setUser(userData.user);
    setLoading(false);
  }, [params.id, router, selectedUnit]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!project || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="text-slate-600">Project not found</p>
          <Link href="/dashboard" className="mt-4 inline-block text-brand-600">
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  const isOwner = user.role === "OWNER";
  const isContractor = user.role === "CONTRACTOR";
  const activeUnit = project.units.find((u) => u.id === selectedUnit) || project.units[0];

  const paidTotal = project.units.reduce((sum, unit) => {
    return (
      sum +
      unit.unitMilestones.reduce((mSum, um) => {
        if (um.status === "PAID") return mSum + Number(um.milestone.amountPerUnit);
        return mSum;
      }, 0)
    );
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <p className="mt-1 text-slate-600">
              {isOwner ? `Contractor: ${project.contractor?.name || "Not invited yet"}` : `Owner: ${project.owner.name}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {project.contractFile && (
              <a
                href={`/api/files/contracts/${project.contractFile}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                View contract
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total budget</p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(Number(project.totalBudget))}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Paid to date</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(paidTotal)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Remaining</p>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(Number(project.totalBudget) - paidTotal)}
            </p>
          </div>
        </div>

        {isOwner && !project.contractor && (
          <div className="mt-8">
            <InviteContractor projectId={project.id} />
          </div>
        )}

        {project.units.length > 1 && (
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {project.units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => setSelectedUnit(unit.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedUnit === unit.id
                    ? "bg-brand-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {unit.address || unit.name}
              </button>
            ))}
          </div>
        )}

        {activeUnit && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {activeUnit.address || activeUnit.name}
              </h2>
              {activeUnit.deadline && (
                <span className="text-sm text-slate-500">
                  Deadline: {formatDate(activeUnit.deadline)}
                </span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {activeUnit.unitMilestones.map((um) => {
                const latestDraw = um.drawRequests[0];
                const showReview =
                  isOwner &&
                  latestDraw &&
                  ["SUBMITTED", "APPROVED", "PAID"].includes(latestDraw.status);

                const showManualPay =
                  isOwner &&
                  ["READY", "APPROVED"].includes(um.status) &&
                  !(
                    latestDraw &&
                    ["SUBMITTED", "APPROVED"].includes(latestDraw.status)
                  );

                return (
                  <div
                    key={um.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm ${
                      um.status === "READY" ? "border-brand-300 ring-1 ring-brand-100" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                            {um.milestone.orderIndex}
                          </span>
                          <div>
                            <h3 className="font-semibold text-slate-900">{um.milestone.name}</h3>
                            <p className="mt-0.5 text-sm text-slate-600">
                              {um.milestone.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-brand-700">
                          {formatCurrency(Number(um.milestone.amountPerUnit))}
                        </p>
                        <StatusBadge status={um.status} className="mt-2" />
                      </div>
                    </div>

                    {isContractor && (
                      <DrawRequestPanel
                        unitMilestoneId={um.id}
                        milestoneName={um.milestone.name}
                        amount={Number(um.milestone.amountPerUnit)}
                        status={um.status}
                        existingDraw={latestDraw}
                        isContractor={isContractor}
                        onUpdate={loadProject}
                      />
                    )}

                    {showReview && (
                      <DrawReviewPanel draw={latestDraw} onUpdate={loadProject} />
                    )}

                    {showManualPay && (
                      <ManualPaymentPanel
                        unitMilestoneId={um.id}
                        milestoneName={um.milestone.name}
                        amount={Number(um.milestone.amountPerUnit)}
                        onUpdate={loadProject}
                      />
                    )}

                    {!isContractor && !showReview && latestDraw?.photos.length ? (
                      <DrawRequestPanel
                        unitMilestoneId={um.id}
                        milestoneName={um.milestone.name}
                        amount={Number(um.milestone.amountPerUnit)}
                        status={um.status}
                        existingDraw={latestDraw}
                        isContractor={false}
                        onUpdate={loadProject}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
