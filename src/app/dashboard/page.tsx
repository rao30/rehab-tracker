import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ContractUpload } from "@/components/ContractUpload";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projects =
    user.role === "OWNER"
      ? await prisma.project.findMany({
          where: { ownerId: user.id },
          include: {
            contractor: { select: { name: true } },
            units: true,
            milestones: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.project.findMany({
          where: { contractorId: user.id },
          include: {
            owner: { select: { name: true } },
            units: true,
            milestones: true,
          },
          orderBy: { createdAt: "desc" },
        });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-slate-600">
              {user.role === "OWNER"
                ? "Manage your renovation projects and payments"
                : "View projects and submit draw requests"}
            </p>
          </div>
        </div>

        {user.role === "OWNER" && (
          <div className="mt-8">
            <ContractUpload />
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Your projects</h2>

          {projects.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-600">No projects yet</p>
              {user.role === "OWNER" && (
                <p className="mt-1 text-sm text-slate-500">
                  Upload a contract above to create your first project
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
                        {project.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {project.units.length} unit(s) · {project.milestones.length} milestones
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-medium text-brand-700">
                      {formatCurrency(Number(project.totalBudget))}
                    </span>
                    <span className="text-slate-500">{formatDate(project.createdAt)}</span>
                  </div>
                  {"contractor" in project && project.contractor && (
                    <p className="mt-2 text-xs text-slate-500">
                      Contractor: {project.contractor.name}
                    </p>
                  )}
                  {"owner" in project && project.owner && (
                    <p className="mt-2 text-xs text-slate-500">Owner: {project.owner.name}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
