import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const categories = await prisma.transaction.groupBy({
      by: ["category"],
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: "desc" } },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Admin categories error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
