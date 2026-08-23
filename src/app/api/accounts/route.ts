import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Account from "@/models/Account";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const accounts = await Account.find({ userId: user.userId }).sort("-createdAt").lean();
    return NextResponse.json({ accounts });
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
    const { accountName, accountType, balance, institution, color } = body;

    if (!accountName || !accountType) {
      return NextResponse.json({ error: "Account name and type are required" }, { status: 400 });
    }

    const account = await Account.create({
      userId: user.userId,
      accountName,
      accountType,
      balance: parseFloat(balance) || 0,
      institution,
      color,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
