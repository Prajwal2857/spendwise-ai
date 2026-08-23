import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: body.read ?? true },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
