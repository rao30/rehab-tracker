import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: { project: { select: { name: true, ownerId: true } } },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { role: true, name: true },
  });

  return NextResponse.json({
    email: invite.email,
    projectName: invite.project.name,
    existingAccount: Boolean(existingUser),
    accountRole: existingUser?.role ?? null,
    existingName: existingUser?.name ?? null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();
  const { name, password } = body;

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: { project: true },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (!user) {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password required (min 8 characters)" }, { status: 400 });
    }
    user = await prisma.user.create({
      data: {
        email: invite.email,
        name: name || invite.email.split("@")[0],
        role: "CONTRACTOR",
        passwordHash: await hashPassword(password),
      },
    });
  } else {
    if (!password) {
      return NextResponse.json(
        { error: "Enter your existing account password to accept this invite" },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (name && name !== user.name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }
  }

  if (invite.project.ownerId === user.id) {
    return NextResponse.json(
      { error: "You cannot be the contractor on your own project" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.project.update({
      where: { id: invite.projectId },
      data: { contractorId: user.id },
    }),
    prisma.projectInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    projectId: invite.projectId,
  });
}
