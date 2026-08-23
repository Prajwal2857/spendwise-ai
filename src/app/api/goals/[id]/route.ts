import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        targetAmount: body.targetAmount ? parseFloat(body.targetAmount) : existing.targetAmount,
        currentAmount: body.currentAmount !== undefined ? parseFloat(body.currentAmount) : existing.currentAmount,
        targetDate: body.targetDate ? new Date(body.targetDate) : existing.targetDate,
        icon: body.icon !== undefined ? body.icon : existing.icon,
        color: body.color !== undefined ? body.color : existing.color,
      },
    });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error("Update goal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.savingsGoal.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete goal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
