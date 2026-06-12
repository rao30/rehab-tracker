import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects =
    user.role === "OWNER"
      ? await prisma.project.findMany({
          where: { ownerId: user.id },
          include: {
            contractor: { select: { id: true, name: true, email: true } },
            units: true,
            milestones: { orderBy: { orderIndex: "asc" } },
            _count: { select: { milestones: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.project.findMany({
          where: { contractorId: user.id },
          include: {
            owner: { select: { id: true, name: true, email: true } },
            units: true,
            milestones: { orderBy: { orderIndex: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, totalBudget } = body;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      ownerId: user.id,
      totalBudget: totalBudget || 0,
    },
  });

  return NextResponse.json({ project });
}
