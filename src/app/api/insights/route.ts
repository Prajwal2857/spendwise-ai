import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Budget from "@/models/Budget";
import Subscription from "@/models/Subscription";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month transactions
    const currentMonthExpenses = await Transaction.find({
      userId: user.userId,
      type: "expense",
      date: { $gte: startOfMonth, $lte: now },
    }).lean();

    // Last month transactions
    const lastMonthExpenses = await Transaction.find({
      userId: user.userId,
      type: "expense",
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }).lean();

    // Current month income
    const currentMonthIncome = await Transaction.find({
      userId: user.userId,
      type: "income",
      date: { $gte: startOfMonth, $lte: now },
    }).lean();

    const totalExpenses = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = currentMonthIncome.reduce((sum, t) => sum + t.amount, 0);

    // Spending by category
    const categoryMap = new Map<string, number>();
    currentMonthExpenses.forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });

    const lastMonthCategoryMap = new Map<string, number>();
    lastMonthExpenses.forEach((t) => {
      lastMonthCategoryMap.set(t.category, (lastMonthCategoryMap.get(t.category) || 0) + t.amount);
    });

    const sortedCategories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0];

    // Budgets
    const budgets = await Budget.find({ userId: user.userId }).lean();
    const budgetAlerts: string[] = [];
    budgets.forEach((b) => {
      const spent = categoryMap.get(b.category) || 0;
      const percentage = (spent / b.amount) * 100;
      if (percentage >= 90) {
        budgetAlerts.push(`You've used ${Math.round(percentage)}% of your ${b.category} budget.`);
      } else if (percentage >= 75) {
        budgetAlerts.push(`Heads up: ${Math.round(percentage)}% of your ${b.category} budget is used.`);
      }
    });

    // Subscriptions
    const subscriptions = await Subscription.find({ userId: user.userId, isActive: true }).lean();
    const totalMonthlySubscriptions = subscriptions.reduce((sum, s) => {
      if (s.billingCycle === "yearly") return sum + s.amount / 12;
      if (s.billingCycle === "weekly") return sum + s.amount * 4;
      if (s.billingCycle === "quarterly") return sum + s.amount / 3;
      return sum + s.amount;
    }, 0);

    // Generate insights
    const insights = [];

    // Spending comparison
    if (lastMonthTotal > 0) {
      const change = ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100;
      if (change < -5) {
        insights.push({
          type: "trend",
          icon: "📈",
          title: "Positive Trend",
          message: `Your spending is ${Math.abs(Math.round(change))}% lower than last month. Great job!`,
          severity: "success",
        });
      } else if (change > 10) {
        insights.push({
          type: "alert",
          icon: "🔎",
          title: "Spending Alert",
          message: `Your spending increased by ${Math.round(change)}% compared to last month.`,
          severity: "warning",
        });
      }
    }

    // Top category insight
    if (topCategory) {
      const [category, amount] = topCategory;
      const lastMonthAmount = lastMonthCategoryMap.get(category) || 0;
      if (lastMonthAmount > 0 && amount > lastMonthAmount) {
        const categoryIncrease = Math.round(((amount - lastMonthAmount) / lastMonthAmount) * 100);
        const potentialSaving = Math.round(amount * 0.2);
        insights.push({
          type: "suggestion",
          icon: "💡",
          title: `Smart Suggestion - ${category}`,
          message: `Your ${category.toLowerCase()} spending increased by ${categoryIncrease}%. Reducing by 20% could save approximately ₹${potentialSaving.toLocaleString("en-IN")}/month.`,
          severity: "info",
        });
      }
    }

    // Savings rate
    if (totalIncome > 0) {
      const savingsRate = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
      if (savingsRate > 20) {
        insights.push({
          type: "trend",
          icon: "📈",
          title: "Great Savings Rate",
          message: `You're saving ${savingsRate}% of your income this month. That's above the recommended 20%!`,
          severity: "success",
        });
      } else if (savingsRate < 10 && totalIncome > 0) {
        insights.push({
          type: "alert",
          icon: "⚠️",
          title: "Low Savings Rate",
          message: `You're only saving ${savingsRate}% of your income. Try to aim for at least 20%.`,
          severity: "warning",
        });
      }
    }

    // Budget alerts
    budgetAlerts.forEach((alert) => {
      insights.push({
        type: "budget",
        icon: "🎯",
        title: "Budget Progress",
        message: alert,
        severity: alert.includes("90") ? "danger" : "warning",
      });
    });

    // Subscription alert
    if (subscriptions.length > 0) {
      const annualCost = Math.round(totalMonthlySubscriptions * 12);
      insights.push({
        type: "subscription",
        icon: "⚠️",
        title: "Subscription Overview",
        message: `You have ${subscriptions.length} active subscriptions costing approximately ₹${Math.round(totalMonthlySubscriptions).toLocaleString("en-IN")}/month (₹${annualCost.toLocaleString("en-IN")}/year).`,
        severity: "info",
      });
    }

    // Upcoming renewals
    const upcomingRenewals = subscriptions.filter((s) => {
      const renewalDate = new Date(s.renewalDate);
      const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil >= 0;
    });

    if (upcomingRenewals.length > 0) {
      const names = upcomingRenewals.map((s) => s.name).join(", ");
      insights.push({
        type: "subscription",
        icon: "🔔",
        title: "Upcoming Renewals",
        message: `${names} ${upcomingRenewals.length === 1 ? "renews" : "renew"} within the next 7 days.`,
        severity: "warning",
      });
    }

    // Yearly projection
    if (totalIncome > 0 && totalExpenses > 0) {
      const monthlySavings = totalIncome - totalExpenses;
      const yearlyProjection = monthlySavings * 12;
      insights.push({
        type: "trend",
        icon: "📊",
        title: "Yearly Projection",
        message: `At your current rate, you're on track to save approximately ₹${yearlyProjection.toLocaleString("en-IN")} this year.`,
        severity: "info",
      });
    }

    return NextResponse.json({ insights });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
