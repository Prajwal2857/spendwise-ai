import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

// Common UPI SMS patterns from Indian banks and payment apps
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "restaurant", "cafe", "food", "pizza", "burger", "chai", "coffee", "mcdonald", "kfc", "subway", "domino", "starbucks", "biryani", "hotel"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "nykaa", "shopping", "store", "mall", "meesho", "tatacliq", "lifestyle", "dmart"],
  Transportation: ["uber", "ola", "metro", "bus", "fuel", "petrol", "parking", "taxi", "rapido", "irctc", "redbus"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "youtube", "hotstar", "prime video", "jiocinema", "sonyliv"],
  "Bills & Utilities": ["electricity", "water", "gas", "internet", "broadband", "recharge", "airtel", "jio", "bsnl", "bill"],
  Healthcare: ["practo", "pharmacy", "medical", "hospital", "doctor", "clinic", "apollo", "pharmeasy"],
  Education: ["course", "udemy", "coursera", "book", "tuition", "college", "unacademy"],
  Housing: ["rent", "maintenance", "society", "housing"],
  Travel: ["flight", "train", "hotel", "booking", "airbnb", "makemytrip"],
};

function categorizeMerchant(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Other";
}

interface ParsedTransaction {
  merchant: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  upiRef: string;
  raw: string;
}

function parseDate(dateStr: string): Date | null {
  // Try DD/MM/YYYY
  let match = dateStr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  // Try DD/MM/YY
  match = dateStr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})\b/);
  if (match) return new Date(2000 + parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  // Try YYYY-MM-DD
  match = dateStr.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  // Try "01 Aug 2025" or "1 Aug 2025"
  match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (match) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const m = months.indexOf(match[2].toLowerCase().substring(0, 3));
    return new Date(parseInt(match[3]), m, parseInt(match[1]));
  }
  // Try "01-Aug-25"
  match = dateStr.match(/(\d{1,2})\s*[-\/]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-\/]\s*(\d{2,4})/i);
  if (match) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const m = months.indexOf(match[2].toLowerCase().substring(0, 3));
    const year = parseInt(match[3]) < 100 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
    return new Date(year, m, parseInt(match[1]));
  }
  // Fallback
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function parseSingleSMS(sms: string): ParsedTransaction | null {
  const text = sms.trim();
  if (text.length < 10) return null;

  // Skip non-transaction SMS (promotional, OTP, etc.)
  if (/\b(otp|verify|code|promo|offer|discount|winner|lucky|claim)\b/i.test(text)) return null;
  // Must contain some monetary indicator
  if (!/₹|rs\.?|inr|rs\b|debited|credited|paid|sent|received|transact/i.test(text)) return null;

  // Extract amount - various formats: ₹500, Rs.500, Rs 500, INR 500.00
  const amountPatterns = [
    /(?:₹|rs\.?|inr)\s*([\d,]+\.?\d{0,2})/gi,
    /([\d,]+\.?\d{0,2})\s*(?:₹|rs\.?|inr)/gi,
  ];

  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = pattern.exec(text);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(amount) && amount > 0) break;
    }
  }
  if (amount <= 0) return null;

  // Determine if income or expense
  const isIncome = /\b(credited|received|deposited|added|refund|cashback|returned)\b/i.test(text);
  const isExpense = /\b(debited|paid|sent|transferred|spent|deducted|payment)\b/i.test(text);
  const type: "income" | "expense" = isIncome ? "income" : "expense";

  // Extract payee/payer name
  let merchant = "Unknown";
  const namePatterns = [
    /(?:beneficiary[:\s]+|payee[:\s]+|merchant[:\s]+)\s*([A-Za-z][A-Za-z0-9\s&._-]{1,30})/i,
    /(?:paid to|sent to)\s+([A-Za-z][A-Za-z0-9\s&._-]{1,40})/i,
    /(?:from|received from|payer[:\s]+|sender[:\s]+|salary from)\s+([A-Za-z][A-Za-z0-9\s&._-]{1,40})/i,
    /(?:to|credited to)\s+([A-Za-z][A-Za-z0-9\s&._-]{1,40})/i,
    /(?:at|@)\s+([A-Za-z][A-Za-z0-9\s&._-]{1,30})/i,
  ];

  // Common phrases that aren't merchant names
  const skipWords = /^(your|account|bank|a\/c|wallet|number|no|the|this|my)\b/i;

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = match[1].trim();
      // Clean up trailing words that aren't part of the name
      name = name.replace(/\s+(via|on|at|ref|upi|transaction|using|through|for|date|time|hrs|am|pm|inr|rs|₹|debit|credit|paid|sent|received|subscription|payment|bill|order|no|number|is|was|has|been|successfully|completed|from|to|your|account|wallet).*$/i, "").trim();
      // Remove trailing punctuation
      name = name.replace(/[.,;:]+$/g, "").trim();
      // Remove phone numbers
      name = name.replace(/\s*\d{10,}\s*/g, "").trim();
      // Remove UPI IDs
      name = name.replace(/\s*[\w.-]+@[\w.-]+\s*/g, "").trim();
      // Skip if it starts with a common non-merchant word
      if (skipWords.test(name)) continue;
      if (name.length >= 2 && name.length <= 50) {
        merchant = name;
        break;
      }
    }
  }

  // If no name found, try to get it from known app names
  if (merchant === "Unknown") {
    const appPatterns = [
      /\b(gpay|google pay|phonepe|phone pe|paytm|bhim|amazon pay|freecharge|mobikwik|cred|slice)\b/i,
    ];
    for (const pattern of appPatterns) {
      const match = text.match(pattern);
      if (match) {
        merchant = match[1];
        break;
      }
    }
  }

  // Last resort: try to find a capitalized word that looks like a brand/merchant
  if (merchant === "Unknown") {
    const brandMatch = text.match(/\b([A-Z][a-zA-Z]{2,20})\b/);
    if (brandMatch && !/^(UPI|INR|RS|REF|TXN|DATE|TIME|AMT|SMS|OTP|YOUR|THIS|THE|HAS|WAS|IS|PAID|SENT|RECEIVED|CREDIT|DEBIT|BANK)$/i.test(brandMatch[1])) {
      merchant = brandMatch[1];
    }
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    /(\d{1,2}\s*[-\/]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-\/]\s*\d{2,4})/i,
  ];

  let dateStr = new Date().toISOString().split("T")[0]; // Default to today
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      dateStr = match[1];
      break;
    }
  }

  // Extract UPI reference
  let upiRef = "";
  const refPatterns = [
    /(?:ref(?:erence)?|utr|txn|transaction)\s*(?:no|num|#|:|\s)*[:\s]*(\w{8,20})/i,
    /\b(\d{10,16})\b/,
  ];
  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match) {
      upiRef = match[1];
      break;
    }
  }

  return {
    merchant: merchant.substring(0, 200),
    amount,
    type,
    date: dateStr,
    upiRef,
    raw: sms.substring(0, 500),
  };
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { messages } = body as { messages?: string };

    if (!messages || typeof messages !== "string" || !messages.trim()) {
      return NextResponse.json({ error: "No SMS messages provided" }, { status: 400 });
    }

    // Split by newlines - each line is a separate SMS
    const smsList = messages.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0);

    if (smsList.length > 50) {
      return NextResponse.json({ error: "Maximum 50 SMS messages at a time" }, { status: 400 });
    }

    const parsed: ParsedTransaction[] = [];
    const failed: { sms: string; reason: string }[] = [];

    for (const sms of smsList) {
      const result = parseSingleSMS(sms);
      if (result) {
        parsed.push(result);
      } else {
        failed.push({ sms: sms.substring(0, 100), reason: "Could not parse as a transaction" });
      }
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        error: "No transactions found in the provided SMS messages",
        failed,
      }, { status: 400 });
    }

    let imported = 0;
    let duplicates = 0;
    let needsReview = 0;
    const newTransactions: {
      userId: string; merchant: string; amount: number; type: string;
      category: string; paymentMethod: string; date: Date; notes: string | null;
    }[] = [];

    for (const txn of parsed) {
      const date = parseDate(txn.date);
      if (!date) { needsReview++; continue; }
      if (isNaN(txn.amount) || txn.amount === 0) { needsReview++; continue; }

      // Deduplication by UPI reference
      if (txn.upiRef) {
        const existing = await prisma.transaction.findFirst({
          where: {
            userId,
            notes: { contains: txn.upiRef },
          },
        });
        if (existing) { duplicates++; continue; }
      }

      // Also check by merchant + date + amount
      const existingByDetails = await prisma.transaction.findFirst({
        where: {
          userId,
          merchant: txn.merchant,
          date,
          amount: txn.amount,
        },
      });
      if (existingByDetails) { duplicates++; continue; }

      const note = txn.upiRef
        ? `UPI Ref: ${txn.upiRef} | Imported from SMS`
        : "Imported from SMS";

      newTransactions.push({
        userId,
        merchant: txn.merchant,
        amount: txn.amount,
        type: txn.type,
        category: categorizeMerchant(txn.merchant),
        paymentMethod: "UPI",
        date,
        notes: note,
      });
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({ data: newTransactions });
      imported = newTransactions.length;
    }

    return NextResponse.json({
      summary: {
        total: smsList.length,
        parsed: parsed.length,
        imported,
        duplicates,
        needsReview,
        failed: failed.length,
      },
      transactions: parsed.map((t) => ({
        merchant: t.merchant,
        amount: t.amount,
        type: t.type,
        date: t.date,
        upiRef: t.upiRef,
      })),
      failed,
    });
  } catch (error) {
    console.error("SMS import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
