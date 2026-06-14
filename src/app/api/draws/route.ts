import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAllowedPhotoMimeType,
  MAX_PHOTOS_PER_DRAW,
  MAX_PHOTO_UPLOAD_BYTES,
} from "@/lib/image-processing";
import { savePhotoFile } from "@/lib/uploads";
import { unlockNextMilestone } from "@/lib/project-service";

const createDrawSchema = z.object({
  unitMilestoneId: z.string(),
  contractorNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const unitMilestoneId = formData.get("unitMilestoneId") as string;
    const contractorNotes = (formData.get("contractorNotes") as string) || undefined;
    const submit = formData.get("submit") === "true";

    const unitMilestone = await prisma.unitMilestone.findUnique({
      where: { id: unitMilestoneId },
      include: {
        milestone: true,
        unit: { include: { project: true } },
      },
    });

    if (!unitMilestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const project = unitMilestone.unit.project;
    const isContractor = project.contractorId === user.id;
    const isOwner = project.ownerId === user.id;

    if (!isContractor && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (isContractor && !["READY", "SUBMITTED"].includes(unitMilestone.status)) {
      return NextResponse.json({ error: "This milestone is not available for draw" }, { status: 400 });
    }

    let draw = await prisma.drawRequest.findFirst({
      where: {
        unitMilestoneId,
        status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!draw) {
      draw = await prisma.drawRequest.create({
        data: {
          unitMilestoneId,
          requesterId: user.id,
          amount: unitMilestone.milestone.amountPerUnit,
          contractorNotes,
          status: submit ? "SUBMITTED" : "DRAFT",
          submittedAt: submit ? new Date() : null,
        },
      });
    } else {
      draw = await prisma.drawRequest.update({
        where: { id: draw.id },
        data: {
          contractorNotes,
          status: submit ? "SUBMITTED" : draw.status,
          submittedAt: submit ? new Date() : draw.submittedAt,
        },
      });
    }

    const photoFiles = formData.getAll("photos") as File[];
    const validPhotos = photoFiles.filter((photo) => photo.size > 0);

    if (validPhotos.length > MAX_PHOTOS_PER_DRAW) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_DRAW} photos per draw request` },
        { status: 400 }
      );
    }

    const existingPhotoCount = await prisma.drawPhoto.count({
      where: { drawRequestId: draw.id },
    });

    if (existingPhotoCount + validPhotos.length > MAX_PHOTOS_PER_DRAW) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_DRAW} photos per draw request` },
        { status: 400 }
      );
    }

    for (const photo of validPhotos) {
      if (photo.size > MAX_PHOTO_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `Each photo must be under ${MAX_PHOTO_UPLOAD_BYTES / (1024 * 1024)} MB` },
          { status: 400 }
        );
      }

      const mimeType = photo.type || "application/octet-stream";
      if (!isAllowedPhotoMimeType(mimeType)) {
        return NextResponse.json(
          { error: "Only image files (JPEG, PNG, WebP, HEIC) are allowed" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await photo.arrayBuffer());
      const saved = await savePhotoFile(buffer);
      await prisma.drawPhoto.create({
        data: {
          drawRequestId: draw.id,
          filename: saved.filename,
          caption: photo.name,
        },
      });
    }

    if (submit) {
      await prisma.unitMilestone.update({
        where: { id: unitMilestoneId },
        data: { status: "SUBMITTED" },
      });
    }

    const fullDraw = await prisma.drawRequest.findUnique({
      where: { id: draw.id },
      include: { photos: true },
    });

    return NextResponse.json({ draw: fullDraw });
  }

  const body = createDrawSchema.parse(await request.json());
  const unitMilestone = await prisma.unitMilestone.findUnique({
    where: { id: body.unitMilestoneId },
    include: { milestone: true, unit: { include: { project: true } } },
  });

  if (!unitMilestone || unitMilestone.unit.project.contractorId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const draw = await prisma.drawRequest.create({
    data: {
      unitMilestoneId: body.unitMilestoneId,
      requesterId: user.id,
      amount: unitMilestone.milestone.amountPerUnit,
      contractorNotes: body.contractorNotes,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  await prisma.unitMilestone.update({
    where: { id: body.unitMilestoneId },
    data: { status: "SUBMITTED" },
  });

  return NextResponse.json({ draw });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    drawId,
    unitMilestoneId,
    action,
    ownerNotes,
    paymentMethod,
    paymentReference,
    paymentNotes,
  } = body;

  if (action === "manual_pay") {
    if (!unitMilestoneId) {
      return NextResponse.json({ error: "unitMilestoneId is required" }, { status: 400 });
    }

    const unitMilestone = await prisma.unitMilestone.findUnique({
      where: { id: unitMilestoneId },
      include: {
        milestone: true,
        unit: { include: { project: true } },
      },
    });

    if (!unitMilestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const project = unitMilestone.unit.project;

    if (user.id !== project.ownerId) {
      return NextResponse.json({ error: "Only the owner can record payments" }, { status: 403 });
    }

    if (!["READY", "APPROVED"].includes(unitMilestone.status)) {
      return NextResponse.json(
        { error: "This milestone cannot be paid in its current state" },
        { status: 400 }
      );
    }

    const pendingDraw = await prisma.drawRequest.findFirst({
      where: {
        unitMilestoneId,
        status: { in: ["SUBMITTED", "APPROVED"] },
      },
    });

    if (pendingDraw) {
      return NextResponse.json(
        { error: "A draw request is pending review — approve and pay it instead" },
        { status: 400 }
      );
    }

    const now = new Date();
    const amount = unitMilestone.milestone.amountPerUnit;

    const draw = await prisma.$transaction(async (tx) => {
      const manualDraw = await tx.drawRequest.create({
        data: {
          unitMilestoneId,
          requesterId: user.id,
          reviewerId: user.id,
          amount,
          status: "PAID",
          ownerNotes: ownerNotes || "Manual payment recorded by owner",
          submittedAt: now,
          reviewedAt: now,
        },
      });

      await tx.payment.create({
        data: {
          drawRequestId: manualDraw.id,
          recordedById: user.id,
          amount,
          method: paymentMethod || "Other",
          reference: paymentReference,
          notes: paymentNotes || "Manual payment — no contractor draw request",
        },
      });

      await tx.unitMilestone.update({
        where: { id: unitMilestoneId },
        data: { status: "PAID" },
      });

      return manualDraw;
    });

    await unlockNextMilestone(unitMilestoneId);

    return NextResponse.json({ success: true, status: "PAID", drawId: draw.id });
  }

  const draw = await prisma.drawRequest.findUnique({
    where: { id: drawId },
    include: {
      unitMilestone: {
        include: {
          unit: { include: { project: true } },
          milestone: true,
        },
      },
    },
  });

  if (!draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  const project = draw.unitMilestone.unit.project;

  if (action === "approve" || action === "reject") {
    if (user.id !== project.ownerId) {
      return NextResponse.json({ error: "Only the owner can review draws" }, { status: 403 });
    }

    const status = action === "approve" ? "APPROVED" : "REJECTED";
    const unitStatus = action === "approve" ? "APPROVED" : "READY";

    await prisma.drawRequest.update({
      where: { id: drawId },
      data: {
        status,
        ownerNotes,
        reviewerId: user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.unitMilestone.update({
      where: { id: draw.unitMilestoneId },
      data: { status: unitStatus },
    });

    return NextResponse.json({ success: true, status });
  }

  if (action === "pay") {
    if (user.id !== project.ownerId) {
      return NextResponse.json({ error: "Only the owner can record payments" }, { status: 403 });
    }

    if (draw.status !== "APPROVED") {
      return NextResponse.json({ error: "Draw must be approved before payment" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.drawRequest.update({
        where: { id: drawId },
        data: { status: "PAID" },
      }),
      prisma.unitMilestone.update({
        where: { id: draw.unitMilestoneId },
        data: { status: "PAID" },
      }),
      prisma.payment.create({
        data: {
          drawRequestId: drawId,
          recordedById: user.id,
          amount: draw.amount,
          method: paymentMethod || "Other",
          reference: paymentReference,
          notes: paymentNotes,
        },
      }),
    ]);

    await unlockNextMilestone(draw.unitMilestoneId);

    return NextResponse.json({ success: true, status: "PAID" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
