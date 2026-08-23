import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
        preferredCategories: user.preferredCategories,
        notificationPreferences: user.notificationPreferences,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const allowedFields = ["name", "currency", "onboardingCompleted", "monthlyIncome", "preferredCategories", "notificationPreferences"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const user = await User.findByIdAndUpdate(payload.userId, updates, { new: true }).select("-passwordHash");
    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        currency: user.currency,
        monthlyIncome: user.monthlyIncome,
        preferredCategories: user.preferredCategories,
        notificationPreferences: user.notificationPreferences,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
