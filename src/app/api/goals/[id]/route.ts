import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsGoal from "@/models/SavingsGoal";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: id, userId: user.userId },
      body,
      { new: true }
    );

    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    return NextResponse.json({ goal });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const goal = await SavingsGoal.findOneAndDelete({ _id: id, userId: user.userId });
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    return NextResponse.json({ message: "Goal deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
