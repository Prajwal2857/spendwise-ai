import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { getUserFromRequest } from "@/lib/auth";

// Simple CSV parser
function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function detectColumnTypes(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  headers.forEach((h) => {
    const lower = h.toLowerCase();
    if (lower.includes("date") || lower.includes("time")) mapping[h] = "date";
    else if (lower.includes("amount") || lower.includes("sum") || lower.includes("debit") || lower.includes("credit") || lower.includes("balance")) mapping[h] = "amount";
    else if (lower.includes("desc") || lower.includes("narration") || lower.includes("merchant") || lower.includes("payee")) mapping[h] = "merchant";
    else if (lower.includes("type") || lower.includes("category")) mapping[h] = "category";
    else if (lower.includes("note") || lower.includes("remark")) mapping[h] = "notes";
  });
  return mapping;
}

function detectIncomeOrExpense(description: string, amount: number): "income" | "expense" {
  const incomeKeywords = ["credit", "salary", "income", "refund", "transfer in", "received", "cashback", "interest"];
  const lower = description.toLowerCase();
  if (incomeKeywords.some((k) => lower.includes(k))) return "income";
  if (amount > 0) return "expense";
  return "expense";
}

function autoCategory(merchant: string): string {
  const lower = merchant.toLowerCase();
  if (lower.includes("swiggy") || lower.includes("zomato") || lower.includes("food") || lower.includes("restaurant") || lower.includes("cafe")) return "Food";
  if (lower.includes("amazon") || lower.includes("flipkart") || lower.includes("myntra") || lower.includes("shopping")) return "Shopping";
  if (lower.includes("uber") || lower.includes("ola") || lower.includes("metro") || lower.includes("petrol") || lower.includes("fuel")) return "Transportation";
  if (lower.includes("rent") || lower.includes("maintenance")) return "Housing";
  if (lower.includes("electricity") || lower.includes("water") || lower.includes("gas") || lower.includes("bill")) return "Bills & Utilities";
  if (lower.includes("netflix") || lower.includes("spotify") || lower.includes("hotstar") || lower.includes("prime")) return "Subscriptions";
  if (lower.includes("movie") || lower.includes("game") || lower.includes("entertainment")) return "Entertainment";
  if (lower.includes("hospital") || lower.includes("medical") || lower.includes("pharmacy")) return "Healthcare";
  if (lower.includes("school") || lower.includes("college") || lower.includes("course")) return "Education";
  if (lower.includes("train") || lower.includes("flight") || lower.includes("hotel")) return "Travel";
  if (lower.includes("recharge") || lower.includes("jio") || lower.includes("airtel")) return "Mobile/Internet";
  if (lower.includes("salary") || lower.includes("income") || lower.includes("credit")) return "Income";
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV file is empty or has no data rows" }, { status: 400 });
    }

    const headers = rows[0];
    const columnMap = detectColumnTypes(headers);

    // Find required columns
    const dateCol = headers.findIndex((h) => columnMap[h] === "date");
    const amountCol = headers.findIndex((h) => columnMap[h] === "amount");
    const merchantCol = headers.findIndex((h) => columnMap[h] === "merchant");
    const notesCol = headers.findIndex((h) => columnMap[h] === "notes");

    if (amountCol === -1) {
      return NextResponse.json({ error: "Could not detect amount column in CSV" }, { status: 400 });
    }

    const dataRows = rows.slice(1);
    const transactions: Array<{
      userId: string;
      merchant: string;
      amount: number;
      type: "income" | "expense";
      category: string;
      paymentMethod: string;
      date: Date;
      notes?: string;
      recurring: boolean;
    }> = [];

    let duplicates = 0;
    let needsReview = 0;

    for (const row of dataRows) {
      if (row.length <= amountCol) { needsReview++; continue; }

      const amountStr = row[amountCol].replace(/[₹$,]/g, "").trim();
      const amount = Math.abs(parseFloat(amountStr));

      if (isNaN(amount) || amount === 0) { needsReview++; continue; }

      const merchant = merchantCol >= 0 ? row[merchantCol]?.trim() || "Unknown" : "Unknown";
      const type = detectIncomeOrExpense(merchant, amount);
      const category = autoCategory(merchant);
      const dateStr = dateCol >= 0 ? row[dateCol]?.trim() : new Date().toISOString();
      const date = dateStr ? new Date(dateStr) : new Date();
      const notes = notesCol >= 0 ? row[notesCol]?.trim() : undefined;

      if (isNaN(date.getTime())) { needsReview++; continue; }

      transactions.push({
        userId: user.userId,
        merchant,
        amount,
        type,
        category,
        paymentMethod: "Bank Transfer",
        date,
        notes,
        recurring: false,
      });
    }

    // Check for duplicates
    const existingDates = new Set<string>();
    for (const t of transactions) {
      const key = `${t.merchant}-${t.amount}-${t.date.toISOString().split("T")[0]}`;
      if (existingDates.has(key)) {
        duplicates++;
      } else {
        existingDates.add(key);
      }
    }

    // Import non-duplicate transactions
    const toImport = transactions.filter((_, i) => {
      const key = `${transactions[i].merchant}-${transactions[i].amount}-${transactions[i].date.toISOString().split("T")[0]}`;
      const keys = [...existingDates];
      return keys.indexOf(key) === i || !existingDates.has(key);
    });

    if (toImport.length > 0) {
      await Transaction.insertMany(toImport);
    }

    return NextResponse.json({
      result: {
        totalFound: dataRows.length,
        imported: toImport.length,
        duplicates,
        needsReview,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
