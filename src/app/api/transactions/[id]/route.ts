import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        merchant: body.merchant ?? existing.merchant,
        amount: body.amount ? parseFloat(body.amount) : existing.amount,
        type: body.type ?? existing.type,
        category: body.category ?? existing.category,
        paymentMethod: body.paymentMethod ?? existing.paymentMethod,
        date: body.date ? new Date(body.date) : existing.date,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        recurring: body.recurring !== undefined ? body.recurring : existing.recurring,
      },
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
