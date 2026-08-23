import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Budget from "@/models/Budget";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const budgets = await Budget.find({ userId: user.userId }).sort("-createdAt").lean();
    return NextResponse.json({ budgets });
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
    const { category, amount, period, startDate, endDate } = body;

    if (!category || !amount) {
      return NextResponse.json({ error: "Category and amount are required" }, { status: 400 });
    }

    // Check if budget already exists for this category
    const existing = await Budget.findOne({ userId: user.userId, category });
    if (existing) {
      return NextResponse.json({ error: "Budget already exists for this category. Edit it instead." }, { status: 400 });
    }

    const budget = await Budget.create({
      userId: user.userId,
      category,
      amount: parseFloat(amount),
      period: period || "monthly",
      startDate: startDate || new Date(),
      endDate,
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
