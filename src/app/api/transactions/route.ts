import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sort = searchParams.get("sort") || "-date";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: user.userId };

    if (category) query.category = category;
    if (type) query.type = type;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { merchant: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
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

    const { merchant, amount, type, category, paymentMethod, date, notes, recurring, accountId } = body;

    if (!merchant || !amount || !type || !category || !paymentMethod || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transaction = await Transaction.create({
      userId: user.userId,
      accountId,
      merchant,
      amount: parseFloat(amount),
      type,
      category,
      paymentMethod,
      date: new Date(date),
      notes,
      recurring: recurring || false,
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
