import { prisma } from "./prisma";

export async function getProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { contractorId: userId }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contractor: { select: { id: true, name: true, email: true } },
      units: true,
      milestones: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}
