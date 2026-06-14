import Link from "next/link";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import {
  FileText,
  Camera,
  CheckCircle2,
  DollarSign,
  ArrowRight,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user.name}</h1>
          <p className="mt-2 text-slate-600">Manage your renovation projects and payments.</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </main>
      </div>
    );
  }

  const features = [
    {
      icon: FileText,
      title: "Upload your contract",
      description:
        "Drop your PDF and we auto-generate a milestone payment checklist from the draw schedule.",
    },
    {
      icon: Camera,
      title: "Contractor submits proof",
      description:
        "Your contractor requests draws with photos and notes when milestones are complete.",
    },
    {
      icon: CheckCircle2,
      title: "Review & approve",
      description:
        "Inspect completed work photos, approve draws, and unlock the next milestone.",
    },
    {
      icon: DollarSign,
      title: "Track payments",
      description:
        "Record Zelle, Venmo, or check payments and keep a full audit trail.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header user={null} />

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Renovation payment management
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Manage renovations
              <span className="block text-brand-600">without the spreadsheet chaos</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Upload your contractor agreement, auto-build your payment checklist, and run
              draw requests from demo to final punch list — all in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 transition-colors"
              >
                Start free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900">
              How it works
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        RenovateFlow — Built for property owners managing contractor renovations
      </footer>
    </div>
  );
}
