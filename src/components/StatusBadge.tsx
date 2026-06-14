import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  LOCKED: "bg-slate-100 text-slate-600",
  READY: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  SUBMITTED: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  PAID: "bg-green-100 text-green-900 ring-1 ring-green-300",
  DRAFT: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[status] || variants.DRAFT,
        className
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
