import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "restaurant", "cafe", "food", "pizza", "burger", "chai", "coffee", "mcdonald", "kfc", "subway", "domino", "starbucks"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "nykaa", "shopping", "store", "mall", "meesho", "tatacliq"],
  Transportation: ["uber", "ola", "metro", "bus", "fuel", "petrol", "parking", "taxi", "rapido", "irctc", "redbus"],
  Entertainment: ["netflix", "spotify", "bookmyshow", "youtube", "hotstar", "prime video", "jiocinema", "sonyliv"],
  "Bills & Utilities": ["electricity", "water", "gas", "internet", "broadband", "recharge", "airtel", "jio", "bsnl"],
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

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strings = content.items.filter((item: any) => item.str).map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

function parseTransactionsFromText(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions: { merchant: string; amount: number; type: string; date: string }[] = [];

  const datePatterns = [
    /(\d{2}[\/-]\d{2}[\/-]\d{4})/,
    /(\d{2}[\/-]\d{2}[\/-]\d{2})/,
    /(\d{4}[\/-]\d{2}[\/-]\d{2})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
  ];

  for (const line of lines) {
    let dateStr = "";
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) { dateStr = match[1] || match[0]; break; }
    }
    if (!dateStr) continue;

    // Find amounts
    const amtRegex = /(?:₹|INR|Rs\.?)\s*([\d,]+\.?\d{0,2})|(?<!\w)([\d,]+\.\d{2})(?!\w)/g;
    const amounts: { value: number; raw: string }[] = [];
    let amtMatch;
    while ((amtMatch = amtRegex.exec(line)) !== null) {
      const val = parseFloat((amtMatch[1] || amtMatch[2] || "0").replace(/,/g, ""));
      if (!isNaN(val) && val > 0) amounts.push({ value: val, raw: amtMatch[0] });
    }
    if (amounts.length === 0) continue;

    // CR/DR detection
    const isCredit = /\b(?:CR|Cr|credit|CREDIT)\b/i.test(line) || line.includes("(Cr)") || line.includes("(CREDIT)");
    const isDebit = /\b(?:DR|Dr|debit|DEBIT)\b/i.test(line) || line.includes("(Dr)") || line.includes("(DEBIT)");

    // Extract merchant
    let merchant = line;
    for (const pattern of datePatterns) merchant = merchant.replace(pattern, "");
    for (const amt of amounts) merchant = merchant.replace(amt.raw, "");
    merchant = merchant.replace(/₹|INR|Rs\.?|CR|DR|Cr|Dr|credit|debit|\(Cr\)|\(Dr\)|\(CREDIT\)|\(DEBIT\)/gi, "")
      .replace(/[\s,]+/g, " ").trim();
    if (merchant.length < 2) merchant = "Unknown Transaction";

    transactions.push({
      merchant: merchant.substring(0, 200),
      amount: amounts[0].value,
      type: isCredit ? "income" : "expense",
      date: dateStr,
    });
  }

  return transactions;
}

function parseDate(dateStr: string): Date | null {
  let match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  match = dateStr.match(/(\d{2})[\/-](\d{2})[\/-](\d{2})/);
  if (match) return new Date(parseInt(match[3]) + 2000, parseInt(match[2]) - 1, parseInt(match[1]));
  match = dateStr.match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
  if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await extractTextFromPDF(buffer);

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from PDF. It may be a scanned/image PDF." }, { status: 400 });
    }

    const parsed = parseTransactionsFromText(text);

    if (parsed.length === 0) {
      return NextResponse.json({ error: "No transactions found in the PDF.", textPreview: text.substring(0, 500) }, { status: 400 });
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

      const existing = await prisma.transaction.findFirst({
        where: { userId, merchant: txn.merchant, date, amount: txn.amount },
      });
      if (existing) { duplicates++; continue; }

      newTransactions.push({
        userId, merchant: txn.merchant, amount: txn.amount, type: txn.type,
        category: categorizeMerchant(txn.merchant), paymentMethod: "Bank Transfer",
        date, notes: "Imported from PDF statement",
      });
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({ data: newTransactions });
      imported = newTransactions.length;
    }

    return NextResponse.json({
      summary: { total: parsed.length, imported, duplicates, needsReview },
    });
  } catch (error) {
    console.error("PDF import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
