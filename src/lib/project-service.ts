import { prisma } from "./prisma";
import { ParsedContract } from "./contract-parser";
import { Decimal } from "@prisma/client/runtime/library";
import { MilestoneUnitStatus } from "@prisma/client";

export interface ScheduleMilestoneInput {
  id?: string;
  orderIndex: number;
  name: string;
  description: string;
  amountPerUnit: number;
  isAdvance?: boolean;
}

const ACTIVE_STATUSES: MilestoneUnitStatus[] = ["SUBMITTED", "APPROVED", "PAID"];

export async function createProjectFromContract(
  ownerId: string,
  contractFilename: string,
  contractText: string,
  parsed: ParsedContract
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: parsed.projectName,
        ownerId,
        contractFile: contractFilename,
        contractText,
        totalBudget: new Decimal(parsed.totalBudget),
        mobilizationAdvance: parsed.mobilizationAdvance
          ? new Decimal(parsed.mobilizationAdvance)
          : null,
      },
    });

    const units = await Promise.all(
      parsed.units.map((unit) =>
        tx.unit.create({
          data: {
            projectId: project.id,
            name: unit.name,
            address: unit.address,
            budget: new Decimal(unit.budget),
            deadline: unit.deadline ? new Date(unit.deadline) : null,
          },
        })
      )
    );

    const milestones = await Promise.all(
      parsed.milestones.map((m) =>
        tx.milestone.create({
          data: {
            projectId: project.id,
            orderIndex: m.orderIndex,
            name: m.name,
            description: m.description,
            amountPerUnit: new Decimal(m.amountPerUnit),
            totalAmount: new Decimal(m.totalAmount),
            isAdvance: m.isAdvance ?? false,
          },
        })
      )
    );

    for (const unit of units) {
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        await tx.unitMilestone.create({
          data: {
            unitId: unit.id,
            milestoneId: milestone.id,
            status: i === 0 ? "READY" : "LOCKED",
          },
        });
      }
    }

    return project;
  });
}

function milestoneIsLocked(
  unitMilestones: {
    status: MilestoneUnitStatus;
    drawRequests: { status: string }[];
  }[]
) {
  return unitMilestones.some(
    (um) =>
      ACTIVE_STATUSES.includes(um.status) ||
      um.drawRequests.some((dr) => dr.status !== "DRAFT")
  );
}

async function recalculateMilestoneStatuses(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  projectId: string
) {
  const units = await tx.unit.findMany({
    where: { projectId },
    include: {
      unitMilestones: {
        include: { milestone: true },
        orderBy: { milestone: { orderIndex: "asc" } },
      },
    },
  });

  for (const unit of units) {
    let readyAssigned = false;

    for (const um of unit.unitMilestones) {
      if (ACTIVE_STATUSES.includes(um.status)) {
        if (um.status === "SUBMITTED" || um.status === "APPROVED") {
          readyAssigned = true;
        }
        continue;
      }

      if (!readyAssigned) {
        if (um.status !== "READY") {
          await tx.unitMilestone.update({
            where: { id: um.id },
            data: { status: "READY" },
          });
        }
        readyAssigned = true;
      } else if (um.status !== "LOCKED") {
        await tx.unitMilestone.update({
          where: { id: um.id },
          data: { status: "LOCKED" },
        });
      }
    }
  }
}

export async function updateProjectSchedule(
  projectId: string,
  ownerId: string,
  milestones: ScheduleMilestoneInput[]
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId },
    include: {
      units: true,
      milestones: {
        include: {
          unitMilestones: {
            include: {
              drawRequests: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (milestones.length === 0) {
    throw new Error("Schedule must have at least one milestone");
  }

  const sorted = [...milestones]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((m, index) => ({
      ...m,
      orderIndex: index + 1,
      name: m.name.trim(),
      description: m.description.trim(),
    }));

  if (sorted.some((m) => !m.name)) {
    throw new Error("Every milestone needs a name");
  }

  if (sorted.some((m) => m.amountPerUnit < 0)) {
    throw new Error("Amounts cannot be negative");
  }

  const existingById = new Map(project.milestones.map((m) => [m.id, m]));
  const payloadIds = new Set(sorted.filter((m) => m.id).map((m) => m.id!));
  const toDelete = project.milestones.filter((m) => !payloadIds.has(m.id));
  const unitCount = project.units.length;

  for (const milestone of toDelete) {
    if (milestoneIsLocked(milestone.unitMilestones)) {
      throw new Error(
        `Cannot remove "${milestone.name}" — draws are already in progress or paid`
      );
    }
  }

  for (const input of sorted) {
    if (!input.id) continue;
    const existing = existingById.get(input.id);
    if (!existing) continue;

    const locked = milestoneIsLocked(existing.unitMilestones);
    const amountChanged =
      Number(existing.amountPerUnit) !== input.amountPerUnit ||
      existing.isAdvance !== (input.isAdvance ?? false);

    if (locked && amountChanged) {
      throw new Error(
        `Cannot change the amount on "${existing.name}" — draws are already in progress or paid`
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    for (const milestone of toDelete) {
      await tx.milestone.delete({ where: { id: milestone.id } });
    }

    for (const input of sorted) {
      const totalAmount = input.amountPerUnit * unitCount;

      if (input.id && existingById.has(input.id)) {
        await tx.milestone.update({
          where: { id: input.id },
          data: {
            orderIndex: input.orderIndex,
            name: input.name,
            description: input.description || input.name,
            amountPerUnit: new Decimal(input.amountPerUnit),
            totalAmount: new Decimal(totalAmount),
            isAdvance: input.isAdvance ?? false,
          },
        });
      } else {
        const milestone = await tx.milestone.create({
          data: {
            projectId,
            orderIndex: input.orderIndex,
            name: input.name,
            description: input.description || input.name,
            amountPerUnit: new Decimal(input.amountPerUnit),
            totalAmount: new Decimal(totalAmount),
            isAdvance: input.isAdvance ?? false,
          },
        });

        for (const unit of project.units) {
          await tx.unitMilestone.create({
            data: {
              unitId: unit.id,
              milestoneId: milestone.id,
              status: "LOCKED",
            },
          });
        }
      }
    }

    await recalculateMilestoneStatuses(tx, projectId);

    return tx.project.findUnique({
      where: { id: projectId },
      include: {
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
  });
}

export async function unlockNextMilestone(unitMilestoneId: string) {
  const current = await prisma.unitMilestone.findUnique({
    where: { id: unitMilestoneId },
    include: { milestone: true, unit: true },
  });
  if (!current) return;

  const nextMilestone = await prisma.milestone.findFirst({
    where: {
      projectId: current.unit.projectId,
      orderIndex: current.milestone.orderIndex + 1,
    },
  });

  if (!nextMilestone) return;

  await prisma.unitMilestone.updateMany({
    where: {
      unitId: current.unitId,
      milestoneId: nextMilestone.id,
      status: "LOCKED",
    },
    data: { status: "READY" },
  });
}