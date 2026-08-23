import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Calculate spent for each budget
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const enriched = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            category: budget.category,
            type: "expense",
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        });
        return { ...budget, spent: spent._sum.amount || 0 };
      })
    );

    return NextResponse.json({ budgets: enriched });
  } catch (error) {
    console.error("Get budgets error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category, amount, period } = await req.json();
    if (!category || !amount) {
      return NextResponse.json({ error: "Category and amount are required" }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budget = await prisma.budget.create({
      data: {
        userId,
        category,
        amount: parseFloat(amount),
        period: period || "monthly",
        startDate: startOfMonth,
        endDate: endOfMonth,
      },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("Create budget error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
