import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectsForUser } from "@/lib/user-projects";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await getProjectsForUser(user.id);

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
