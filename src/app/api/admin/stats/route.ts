import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalUsers, totalTransactions, activeSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.subscription.count({ where: { active: true } }),
    ]);

    const topCategories = await prisma.transaction.groupBy({
      by: ["category"],
      where: { type: "expense" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    });

    return NextResponse.json({
      stats: { totalUsers, totalTransactions, activeSubscriptions },
      topCategories,
      recentUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
