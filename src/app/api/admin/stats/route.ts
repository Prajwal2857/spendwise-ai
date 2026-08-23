import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Budget from "@/models/Budget";
import Subscription from "@/models/Subscription";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await connectDB();

    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const totalBudgets = await Budget.countDocuments();
    const totalSubscriptions = await Subscription.countDocuments();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await Transaction.distinct("userId", { createdAt: { $gte: thirtyDaysAgo } });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newRegistrations = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Top categories
    const categoryAgg = await Transaction.aggregate([
      { $match: { type: "expense" } },
      { $group: { _id: "$category", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]);

    // Recent registrations
    const recentUsers = await User.find()
      .select("name email createdAt role")
      .sort("-createdAt")
      .limit(10)
      .lean();

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers: activeUsers.length,
        newRegistrations,
        totalTransactions,
        totalBudgets,
        totalSubscriptions,
        topCategories: categoryAgg,
        recentUsers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
