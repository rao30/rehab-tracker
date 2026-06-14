import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateProjectSchedule } from "@/lib/project-service";

const milestoneSchema = z.object({
  id: z.string().optional(),
  orderIndex: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  amountPerUnit: z.number().min(0),
  isAdvance: z.boolean().optional(),
});

const scheduleSchema = z.object({
  milestones: z.array(milestoneSchema).min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid schedule data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const project = await updateProjectSchedule(id, user.id, parsed.data.milestones);

    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update schedule";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
