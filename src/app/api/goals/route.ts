import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsGoal from "@/models/SavingsGoal";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const goals = await SavingsGoal.find({ userId: user.userId }).sort("-createdAt").lean();
    return NextResponse.json({ goals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { name, targetAmount, currentAmount, targetDate, icon, color } = body;

    if (!name || !targetAmount) {
      return NextResponse.json({ error: "Name and target amount are required" }, { status: 400 });
    }

    const goal = await SavingsGoal.create({
      userId: user.userId,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      targetDate: targetDate || undefined,
      icon,
      color,
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
