import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, amount, billingCycle, renewalDate, category, icon } = await req.json();
    if (!name || !amount || !renewalDate) {
      return NextResponse.json({ error: "Name, amount, and renewal date required" }, { status: 400 });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        name,
        amount: parseFloat(amount),
        billingCycle: billingCycle || "monthly",
        renewalDate: new Date(renewalDate),
        category: category || null,
        icon: icon || null,
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
