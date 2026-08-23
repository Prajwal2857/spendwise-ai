import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Get goals error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, targetAmount, targetDate, icon, color } = await req.json();
    if (!name || !targetAmount) {
      return NextResponse.json({ error: "Name and target amount required" }, { status: 400 });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount: parseFloat(targetAmount),
        targetDate: targetDate ? new Date(targetDate) : null,
        icon: icon || null,
        color: color || null,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Create goal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
