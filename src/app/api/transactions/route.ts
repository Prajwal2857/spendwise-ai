import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (category) where.category = category;
    if (type) where.type = type;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) {
      where.OR = [
        { merchant: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { account: { select: { name: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, limit });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { merchant, amount, type, category, paymentMethod, date, notes, accountId, recurring } = body;

    if (!merchant || !amount || !type || !category || !paymentMethod || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        merchant,
        amount: parseFloat(amount),
        type,
        category,
        paymentMethod,
        date: new Date(date),
        notes: notes || null,
        accountId: accountId || null,
        recurring: recurring || false,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
