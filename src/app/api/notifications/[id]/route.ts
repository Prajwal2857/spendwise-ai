import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    return NextResponse.json({ notification });
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

    const notification = await Notification.findOneAndDelete({ _id: id, userId: user.userId });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    return NextResponse.json({ message: "Notification deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
