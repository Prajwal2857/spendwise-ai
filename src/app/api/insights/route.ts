import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month totals
    const [currentExpenses, currentIncome] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "expense", date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "income", date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    // Last month totals
    const [lastExpensesResult, lastIncomeResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "expense", date: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "income", date: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
    ]);

    const totalSpent = currentExpenses._sum.amount || 0;
    const totalIncome = currentIncome._sum.amount || 0;
    const lastSpent = lastExpensesResult._sum.amount || 0;
    const lastIncomeTotal = lastIncomeResult._sum.amount || 0;

    // Spending by category this month
    const categorySpending = await prisma.transaction.groupBy({
      by: ["category"],
      where: { userId, type: "expense", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    // Budget alerts
    const budgets = await prisma.budget.findMany({ where: { userId } });
    const budgetAlerts = budgets.map((budget) => {
      const categoryData = categorySpending.find((c) => c.category === budget.category);
      const spent = categoryData?._sum.amount || 0;
      const percentage = Math.round((spent / budget.amount) * 100);
      let status: "safe" | "warning" | "over" = "safe";
      if (percentage >= 100) status = "over";
      else if (percentage >= 75) status = "warning";
      return { ...budget, spent, percentage, status };
    });

    // Active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { userId, active: true },
    });
    const monthlySubCost = activeSubscriptions.reduce((sum, s) => {
      if (s.billingCycle === "monthly") return sum + s.amount;
      if (s.billingCycle === "yearly") return sum + s.amount / 12;
      if (s.billingCycle === "weekly") return sum + s.amount * 4;
      return sum + s.amount;
    }, 0);

    // Build insights
    const insights: { icon: string; title: string; message: string; type: string }[] = [];

    // Savings rate
    if (totalIncome > 0) {
      const savingsRate = Math.round(((totalIncome - totalSpent) / totalIncome) * 100);
      if (savingsRate >= 20) {
        insights.push({
          icon: "📈",
          title: "Great Savings Rate",
          message: `You're saving ${savingsRate}% of your income this month. That's above the recommended 20%!`,
          type: "success",
        });
      } else if (savingsRate < 10) {
        insights.push({
          icon: "⚠️",
          title: "Low Savings Rate",
          message: `You're only saving ${savingsRate}% of your income. Try to aim for at least 20%.`,
          type: "warning",
        });
      }
    }

    // Spending comparison
    if (lastSpent > 0) {
      const change = Math.round(((totalSpent - lastSpent) / lastSpent) * 100);
      if (change > 10) {
        insights.push({
          icon: "📊",
          title: "Spending Increased",
          message: `Your spending increased by ${change}% compared to last month.`,
          type: "warning",
        });
      } else if (change < -10) {
        insights.push({
          icon: "🎉",
          title: "Spending Decreased",
          message: `Great job! Your spending decreased by ${Math.abs(change)}% compared to last month.`,
          type: "success",
        });
      }
    }

    // Budget alerts
    budgetAlerts.forEach((b) => {
      if (b.status === "over") {
        insights.push({
          icon: "🎯",
          title: "Budget Exceeded",
          message: `You've used ${b.percentage}% of your ${b.category} budget.`,
          type: "warning",
        });
      } else if (b.status === "warning") {
        insights.push({
          icon: "🎯",
          title: "Budget Warning",
          message: `Heads up: ${b.percentage}% of your ${b.category} budget is used.`,
          type: "warning",
        });
      }
    });

    // Subscription overview
    if (activeSubscriptions.length > 0) {
      const annualCost = Math.round(monthlySubCost * 12);
      insights.push({
        icon: "⚠️",
        title: "Subscription Overview",
        message: `You have ${activeSubscriptions.length} active subscriptions costing approximately ₹${Math.round(monthlySubCost).toLocaleString("en-IN")}/month (₹${annualCost.toLocaleString("en-IN")}/year).`,
        type: "info",
      });
    }

    // Top category
    if (categorySpending.length > 0) {
      const top = categorySpending[0];
      insights.push({
        icon: "🔍",
        title: "Top Spending Category",
        message: `Your biggest expense category this month is ${top.category} at ₹${(top._sum.amount || 0).toLocaleString("en-IN")}.`,
        type: "info",
      });
    }

    return NextResponse.json({
      insights,
      summary: {
        totalSpent,
        totalIncome,
        lastSpent,
        lastIncome: lastIncomeTotal,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0,
        categorySpending: categorySpending.map((c) => ({
          category: c.category,
          amount: c._sum.amount || 0,
        })),
        budgetAlerts,
        monthlySubCost: Math.round(monthlySubCost),
      },
    });
  } catch (error) {
    console.error("Get insights error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
