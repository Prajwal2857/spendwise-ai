import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: user.userId };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query).sort("-createdAt").limit(50).lean();
    const unreadCount = await Notification.countDocuments({ userId: user.userId, read: false });

    return NextResponse.json({ notifications, unreadCount });
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
    const { title, message, type } = body;

    const notification = await Notification.create({
      userId: user.userId,
      title,
      message,
      type: type || "info",
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    await Notification.updateMany({ userId: user.userId, read: false }, { read: true });
    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
