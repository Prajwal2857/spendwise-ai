import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        amount: body.amount ? parseFloat(body.amount) : existing.amount,
        billingCycle: body.billingCycle ?? existing.billingCycle,
        renewalDate: body.renewalDate ? new Date(body.renewalDate) : existing.renewalDate,
        category: body.category !== undefined ? body.category : existing.category,
        active: body.active !== undefined ? body.active : existing.active,
        icon: body.icon !== undefined ? body.icon : existing.icon,
      },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.subscription.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete subscription error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
