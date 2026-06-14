import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      OR: [{ ownerId: user.id }, { contractorId: user.id }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contractor: { select: { id: true, name: true, email: true } },
      units: {
        include: {
          unitMilestones: {
            include: {
              milestone: true,
              drawRequests: {
                include: {
                  photos: true,
                  payment: true,
                  requester: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: { milestone: { orderIndex: "asc" } },
          },
        },
      },
      milestones: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}
