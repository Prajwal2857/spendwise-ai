import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import Papa from "papaparse";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "restaurant", "cafe", "food", "pizza", "burger", "chai", "coffee"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "nykaa", "shopping", "store", "mall"],
  Transportation: ["uber", "ola", "metro", "bus", "fuel", "petrol", "parking", "taxi"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "youtube", "hotstar", "prime video"],
  "Bills & Utilities": ["electricity", "water", "gas", "internet", "broadland", "recharge"],
  Healthcare: ["practo", "pharmacy", "medical", "hospital", "doctor", "clinic"],
  Education: ["course", "udemy", "coursera", "book", "tuition", "college"],
  Housing: ["rent", "maintenance", "society"],
  Travel: ["flight", "train", "hotel", "booking", "airbnb"],
};

function categorizeMerchant(merchant: string): string {
  const lower = merchant.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: "CSV parsing failed", details: parsed.errors.slice(0, 5) }, { status: 400 });
    }

    const rows = parsed.data as Record<string, string>[];
    const headers = Object.keys(rows[0] || {});
    const headerLower = headers.map((h) => h.toLowerCase());

    // Detect column mapping
    const findCol = (terms: string[]) => headers.find((h) => terms.some((t) => h.toLowerCase().includes(t)));
    const dateCol = findCol(["date", "time", "transaction date"]);
    const amountCol = findCol(["amount", "debit", "credit", "value"]);
    const descCol = findCol(["description", "narration", "merchant", "payee", "details"]);
    const typeCol = findCol(["type", "debit/credit", "txn type"]);
    const debitCol = findCol(["debit", "dr"]);
    const creditCol = findCol(["credit", "cr"]);

    if (!dateCol || !amountCol) {
      return NextResponse.json({ error: "Could not detect date and amount columns", headers }, { status: 400 });
    }

    let imported = 0;
    let duplicates = 0;
    let needsReview = 0;
    const newTransactions: {
      userId: string;
      merchant: string;
      amount: number;
      type: string;
      category: string;
      paymentMethod: string;
      date: Date;
      notes: string | null;
    }[] = [];

    for (const row of rows) {
      const dateStr = row[dateCol];
      const merchant = descCol ? row[descCol] || "Unknown" : "Unknown";
      let amount = 0;
      let txnType = "expense";

      if (debitCol && creditCol) {
        const debit = parseFloat((row[debitCol] || "0").replace(/[₹,]/g, ""));
        const credit = parseFloat((row[creditCol] || "0").replace(/[₹,]/g, ""));
        if (credit > 0) {
          amount = credit;
          txnType = "income";
        } else {
          amount = debit;
          txnType = "expense";
        }
      } else {
        amount = Math.abs(parseFloat((row[amountCol] || "0").replace(/[₹,]/g, "")));
        if (typeCol) {
          const typeVal = (row[typeCol] || "").toLowerCase();
          if (typeVal.includes("credit") || typeVal.includes("cr") || typeVal.includes("income")) {
            txnType = "income";
          }
        } else if (headerLower.some((h) => h.includes("credit")) && headerLower.some((h) => h.includes("debit"))) {
          // fallback
        }
      }

      if (isNaN(amount) || amount === 0) { needsReview++; continue; }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) { needsReview++; continue; }

      // Check duplicates
      const existing = await prisma.transaction.findFirst({
        where: { userId, merchant, date, amount },
      });
      if (existing) { duplicates++; continue; }

      newTransactions.push({
        userId,
        merchant: merchant.substring(0, 200),
        amount,
        type: txnType,
        category: categorizeMerchant(merchant),
        paymentMethod: "Bank Transfer",
        date,
        notes: "Imported from CSV",
      });
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({ data: newTransactions });
      imported = newTransactions.length;
    }

    return NextResponse.json({
      summary: { total: rows.length, imported, duplicates, needsReview },
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
