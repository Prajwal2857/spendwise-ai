import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        category: body.category ?? existing.category,
        amount: body.amount ? parseFloat(body.amount) : existing.amount,
        period: body.period ?? existing.period,
      },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Update budget error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete budget error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
