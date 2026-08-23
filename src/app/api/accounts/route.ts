import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Get accounts error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, type, balance, institution } = await req.json();
    if (!name || !type) {
      return NextResponse.json({ error: "Name and type required" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        userId,
        name,
        type,
        balance: balance ? parseFloat(balance) : 0,
        institution: institution || null,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
