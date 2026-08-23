import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";


const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    "swiggy",
    "zomato",
    "restaurant",
    "cafe",
    "food",
    "pizza",
    "burger",
    "chai",
    "coffee",
    "mcdonald",
    "kfc",
    "subway",
    "domino",
    "starbucks",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "nykaa",
    "shopping",
    "store",
    "mall",
    "meesho",
    "tatacliq",
  ],
  Transportation: [
    "uber",
    "ola",
    "metro",
    "bus",
    "fuel",
    "petrol",
    "parking",
    "taxi",
    "rapido",
    "irctc",
    "redbus",
  ],
  Entertainment: [
    "netflix",
    "spotify",
    "bookmyshow",
    "youtube",
    "hotstar",
    "prime video",
    "jiocinema",
    "sonyliv",
  ],
  "Bills & Utilities": [
    "electricity",
    "water",
    "gas",
    "internet",
    "broadband",
    "recharge",
    "airtel",
    "jio",
    "bsnl",
    "vi ",
  ],
  Healthcare: [
    "practo",
    "pharmacy",
    "medical",
    "hospital",
    "doctor",
    "clinic",
    "apollo",
    "pharmeasy",
    "netmeds",
  ],
  Education: [
    "course",
    "udemy",
    "coursera",
    "book",
    "tuition",
    "college",
    "unacademy",
  ],
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

/**
 * Extract transactions from PDF text.
 * Supports common Indian bank statement formats:
 * - SBI / HDFC / ICICI / Axis / Kotak style
 * - Looks for lines with a date, description, and amount
 */
function parseTransactionsFromText(text: string): {
  merchant: string;
  amount: number;
  type: string;
  date: string;
  raw: string;
}[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions: {
    merchant: string;
    amount: number;
    type: string;
    date: string;
    raw: string;
  }[] = [];

  // Common date patterns
  const datePatterns = [
    /(\d{2}[\/-]\d{2}[\/-]\d{4})/, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{2}[\/-]\d{2}[\/-]\d{2})/, // DD/MM/YY or DD-MM-YY
    /(\d{4}[\/-]\d{2}[\/-]\d{2})/, // YYYY-MM-DD
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i, // 12 Aug 2026
  ];

  // Amount pattern: ₹1,234.56 or 1234.56 or -1234.56 or CR 1234.56 / DR 1234.56
  const amountPattern =
    /(?:₹|INR|Rs\.?|₹\s*)?([\d,]+\.?\d{0,2})|((?:CR|DR|Cr|Dr|credit|debit)\s+[\d,]+\.?\d{0,2})/gi;

  for (const line of lines) {
    // Find date in line
    let dateStr = "";
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        dateStr = match[1] || match[0];
        break;
      }
    }

    if (!dateStr) continue;

    // Find amounts in line
    const amounts: { value: number; raw: string }[] = [];
    const amtRegex =
      /(?:₹|INR|Rs\.?)\s*([\d,]+\.?\d{0,2})|(?<!\w)([\d,]+\.\d{2})(?!\w)/g;
    let amtMatch;
    while ((amtMatch = amtRegex.exec(line)) !== null) {
      const val = parseFloat((amtMatch[1] || amtMatch[2] || "0").replace(/,/g, ""));
      if (!isNaN(val) && val > 0) {
        amounts.push({ value: val, raw: amtMatch[0] });
      }
    }

    if (amounts.length === 0) continue;

    // Determine income/expense from CR/DR markers or positive/negative
    const isCredit =
      /\b(?:CR|Cr|credit|CREDIT)\b/i.test(line) ||
      line.includes("(Cr)") ||
      line.includes("(CREDIT)");

    const isDebit =
      /\b(?:DR|Dr|debit|DEBIT)\b/i.test(line) ||
      line.includes("(Dr)") ||
      line.includes("(DEBIT)");

    // Remove date and amounts from line to get merchant/description
    let merchant = line;
    for (const pattern of datePatterns) {
      merchant = merchant.replace(pattern, "");
    }
    for (const amt of amounts) {
      merchant = merchant.replace(amt.raw, "");
    }
    merchant = merchant
      .replace(/₹|INR|Rs\.?|CR|DR|Cr|Dr|credit|debit/gi, "")
      .replace(/[\s,]+/g, " ")
      .trim();

    if (merchant.length < 2) merchant = "Unknown Transaction";

    // Clean up amount - take the first meaningful amount
    const amount = amounts[0].value;

    transactions.push({
      merchant: merchant.substring(0, 200),
      amount,
      type: isCredit ? "income" : isDebit ? "expense" : "expense",
      date: dateStr,
      raw: line,
    });
  }

  return transactions;
}

function parseDate(dateStr: string): Date | null {
  // DD/MM/YYYY or DD-MM-YYYY
  let match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  }

  // DD/MM/YY or DD-MM-YY
  match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{2})/);
  if (match) {
    const year = parseInt(match[3]) + 2000;
    return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
  }

  // YYYY-MM-DD
  match = dateStr.match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  // Try native parsing as last resort
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file)
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = (await import("pdf-parse") as { default: (buf: Buffer) => Promise<{ text: string }> }).default;
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from PDF. The file may be a scanned/image PDF.",
        },
        { status: 400 }
      );
    }

    // Parse transactions from text
    const parsed = parseTransactionsFromText(pdfData.text);

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error:
            "No transactions found in the PDF. The format may not be supported.",
          textPreview: pdfData.text.substring(0, 500),
        },
        { status: 400 }
      );
    }

    // Import transactions
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

    for (const txn of parsed) {
      const date = parseDate(txn.date);
      if (!date) {
        needsReview++;
        continue;
      }

      if (isNaN(txn.amount) || txn.amount === 0) {
        needsReview++;
        continue;
      }

      // Check for duplicates
      const existing = await prisma.transaction.findFirst({
        where: { userId, merchant: txn.merchant, date, amount: txn.amount },
      });
      if (existing) {
        duplicates++;
        continue;
      }

      newTransactions.push({
        userId,
        merchant: txn.merchant,
        amount: txn.amount,
        type: txn.type,
        category: categorizeMerchant(txn.merchant),
        paymentMethod: "Bank Transfer",
        date,
        notes: "Imported from PDF statement",
      });
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({ data: newTransactions });
      imported = newTransactions.length;
    }

    return NextResponse.json({
      summary: {
        total: parsed.length,
        imported,
        duplicates,
        needsReview,
      },
    });
  } catch (error) {
    console.error("PDF import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
