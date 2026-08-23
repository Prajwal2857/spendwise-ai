import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subscription from "@/models/Subscription";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId: user.userId },
      body,
      { new: true }
    );

    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json({ subscription });
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

    const subscription = await Subscription.findOneAndDelete({ _id: id, userId: user.userId });
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json({ message: "Subscription deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
