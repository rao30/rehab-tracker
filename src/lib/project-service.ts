import { prisma } from "./prisma";
import { ParsedContract } from "./contract-parser";
import { Decimal } from "@prisma/client/runtime/library";

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
