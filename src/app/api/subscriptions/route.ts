import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subscription from "@/models/Subscription";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const subscriptions = await Subscription.find({ userId: user.userId }).sort("-createdAt").lean();
    return NextResponse.json({ subscriptions });
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
    const { name, amount, billingCycle, renewalDate, category, notes } = body;

    if (!name || !amount || !renewalDate) {
      return NextResponse.json({ error: "Name, amount, and renewal date are required" }, { status: 400 });
    }

    const subscription = await Subscription.create({
      userId: user.userId,
      name,
      amount: parseFloat(amount),
      billingCycle: billingCycle || "monthly",
      renewalDate: new Date(renewalDate),
      category: category || "Subscriptions",
      notes,
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
