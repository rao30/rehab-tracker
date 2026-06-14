import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { sendContractorInviteEmail } from "@/lib/email";
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
  const inviteEmail = body.email.toLowerCase();

  if (inviteEmail === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot invite yourself as the contractor" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.contractorId) {
    return NextResponse.json(
      { error: "This project already has a contractor assigned" },
      { status: 400 }
    );
  }

  await prisma.projectInvite.updateMany({
    where: {
      projectId: id,
      email: inviteEmail,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const invite = await prisma.projectInvite.create({
    data: {
      projectId: id,
      email: inviteEmail,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;

  const emailResult = await sendContractorInviteEmail({
    to: inviteEmail,
    projectName: project.name,
    ownerName: user.name,
    inviteUrl,
    expiresAt: invite.expiresAt,
  });

  return NextResponse.json({
    inviteUrl,
    expiresAt: invite.expiresAt,
    emailSent: emailResult.sent,
    emailError: emailResult.error,
  });
}
