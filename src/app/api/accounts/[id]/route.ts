import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Account from "@/models/Account";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const account = await Account.findOneAndUpdate(
      { _id: id, userId: user.userId },
      body,
      { new: true }
    );

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ account });
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

    const account = await Account.findOneAndDelete({ _id: id, userId: user.userId });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ message: "Account deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
