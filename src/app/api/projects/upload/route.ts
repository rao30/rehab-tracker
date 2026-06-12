import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseContract, extractTextFromPdf } from "@/lib/contract-parser";
import { createProjectFromContract } from "@/lib/project-service";
import { saveContractFile } from "@/lib/uploads";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("contract") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Contract file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let contractText = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      contractText = await extractTextFromPdf(buffer);
    } else {
      contractText = buffer.toString("utf-8");
    }

    if (!contractText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from contract. Try a text-based PDF." },
        { status: 400 }
      );
    }

    const parsed = await parseContract(contractText);
    const filename = await saveContractFile(buffer, file.name);
    const project = await createProjectFromContract(user.id, filename, contractText, parsed);

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        units: true,
        milestones: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json({
      project: fullProject,
      parsed,
    });
  } catch (error) {
    console.error("Contract upload error:", error);
    return NextResponse.json({ error: "Failed to process contract" }, { status: 500 });
  }
}
