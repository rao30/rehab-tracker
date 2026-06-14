import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = inviteSchema.parse(await request.json());

  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  const invite = await prisma.projectInvite.create({
    data: {
      projectId: id,
      email: body.email.toLowerCase(),
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;

  return NextResponse.json({ inviteUrl, expiresAt: invite.expiresAt });
}
