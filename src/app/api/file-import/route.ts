import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "restaurant", "cafe", "food", "pizza", "burger", "chai", "coffee", "mcdonald", "kfc", "subway", "domino", "starbucks", "biryani"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "nykaa", "shopping", "store", "mall", "meesho", "tatacliq", "lifestyle"],
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

    const amtRegex = /(?:₹|INR|Rs\.?)\s*([\d,]+\.?\d{0,2})|(?<!\w)([\d,]+\.\d{2})(?!\w)/g;
    const amounts: { value: number; raw: string }[] = [];
    let amtMatch;
    while ((amtMatch = amtRegex.exec(line)) !== null) {
      const val = parseFloat((amtMatch[1] || amtMatch[2] || "0").replace(/,/g, ""));
      if (!isNaN(val) && val > 0) amounts.push({ value: val, raw: amtMatch[0] });
    }
    if (amounts.length === 0) continue;

    const isCredit = /\b(?:CR|Cr|credit|CREDIT)\b/i.test(line) || line.includes("(Cr)") || line.includes("(CREDIT)");
    const isDebit = /\b(?:DR|Dr|debit|DEBIT)\b/i.test(line) || line.includes("(Dr)") || line.includes("(DEBIT)");

    let merchant = line;
    for (const pattern of datePatterns) merchant = merchant.replace(pattern, "");
    for (const amt of amounts) merchant = merchant.replace(amt.raw, "");
    merchant = merchant.replace(/₹|INR|Rs\.?|CR|DR|Cr|Dr|credit|debit|\(Cr\)|\(Dr\)|\(CREDIT\)|\(DEBIT\)/gi, "")
      .replace(/[\s,]+/g, " ").trim();
    if (merchant.length < 2) merchant = "Unknown Transaction";

    transactions.push({
      merchant: merchant.substring(0, 200),
      amount: amounts[0].value,
      type: isCredit ? "income" : isDebit ? "expense" : "expense",
      date: dateStr,
    });
  }

  return transactions;
}

function parseTransactionsFromCSV(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = lines[0].toLowerCase();
  const transactions: { merchant: string; amount: number; type: string; date: string }[] = [];

  // Try to detect column mapping from header
  const headerCols = parseCSVLine(lines[0]);
  const dateIdx = headerCols.findIndex((h) => /date|trans.*date|txn.*date/i.test(h));
  const descIdx = headerCols.findIndex((h) => /desc|narr|particular|merchant|payee|to\/from|benef/i.test(h));
  const amtIdx = headerCols.findIndex((h) => /amount|amt|sum|total/i.test(h));
  const typeIdx = headerCols.findIndex((h) => /type|debit.*credit|dr.*cr| txn.*type/i.test(h));
  const debitIdx = headerCols.findIndex((h) => /debit|dr|withdraw/i.test(h));
  const creditIdx = headerCols.findIndex((h) => /credit|cr|deposit/i.test(h));

  // If we can't detect standard columns, try a generic approach
  const hasStandardColumns = dateIdx >= 0 || descIdx >= 0 || amtIdx >= 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    let dateStr = "";
    let merchant = "";
    let amount = 0;
    let type = "expense";

    if (hasStandardColumns) {
      // Standard column-based parsing
      if (dateIdx >= 0 && cols[dateIdx]) dateStr = cols[dateIdx].trim();
      if (descIdx >= 0 && cols[descIdx]) merchant = cols[descIdx].trim();

      if (amtIdx >= 0 && cols[amtIdx]) {
        amount = parseAmount(cols[amtIdx]);
      } else if (debitIdx >= 0 && creditIdx >= 0) {
        const debit = cols[debitIdx] ? parseAmount(cols[debitIdx]) : 0;
        const credit = cols[creditIdx] ? parseAmount(cols[creditIdx]) : 0;
        if (credit > 0) { amount = credit; type = "income"; }
        else { amount = debit; type = "expense"; }
      }

      // Detect type from type column or CR/DR markers
      if (typeIdx >= 0 && cols[typeIdx]) {
        const typeVal = cols[typeIdx].toLowerCase();
        if (/credit|cr|income|deposit/i.test(typeVal)) type = "income";
        else if (/debit|dr|expense|withdraw/i.test(typeVal)) type = "expense";
      }
    } else {
      // Fallback: try to find date, description, amount in all columns
      for (const col of cols) {
        const trimmed = col.trim();
        if (!dateStr && /\d{2}[\/-]\d{2}[\/-]\d{2,4}/.test(trimmed)) {
          dateStr = trimmed;
        } else if (!merchant && /[a-zA-Z]{3,}/.test(trimmed) && !/₹|INR|Rs/i.test(trimmed)) {
          merchant = trimmed;
        } else if (amount === 0) {
          const val = parseAmount(trimmed);
          if (val > 0) {
            amount = val;
            if (/credit|cr|income|deposit/i.test(trimmed)) type = "income";
          }
        }
      }
    }

    // Check for CR/DR in any column
    if (type === "expense") {
      const lineText = cols.join(" ").toLowerCase();
      if (/\bcr\b|credit|income|deposit/.test(lineText)) type = "income";
    }

    if (!dateStr || !amount || amount === 0) continue;
    if (!merchant || merchant.length < 2) merchant = "Unknown Transaction";

    transactions.push({
      merchant: merchant.substring(0, 200),
      amount,
      type,
      date: dateStr,
    });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/[₹$€£]|INR|USD|EUR|GBP/gi, "").replace(/,/g, "").trim();
  const match = cleaned.match(/([\d.]+)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  return isNaN(val) ? 0 : Math.abs(val);
}

function parseDate(dateStr: string): Date | null {
  // Try DD/MM/YYYY
  let match = dateStr.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  // Try DD/MM/YY
  match = dateStr.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{2})/);
  if (match) return new Date(parseInt(match[3]) + 2000, parseInt(match[2]) - 1, parseInt(match[1]));
  // Try YYYY/MM/DD
  match = dateStr.match(/(\d{4})[\/.-](\d{2})[\/.-](\d{2})/);
  if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  // Try DD Mon YYYY
  match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (match) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const m = months.indexOf(match[2].toLowerCase().substring(0, 3));
    return new Date(parseInt(match[3]), m, parseInt(match[1]));
  }
  // Fallback to Date parser
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const uint8 = new Uint8Array(buffer);
  const result = await extractText(uint8);
  return Array.isArray(result.text) ? result.text.join("\n") : result.text;
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js");
  // Add timeout: if OCR takes longer than 30s, fail gracefully
  const result = await Promise.race([
    Tesseract.recognize(buffer, "eng", {}),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("OCR timed out after 30 seconds. Try using a PDF or CSV instead.")), 30000)
    ),
  ]);
  return result.data.text;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    // Check file size (Vercel limit is ~4.5MB)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 4MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isCSV = ext === "csv" || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
    const isPDF = ext === "pdf" || file.type === "application/pdf";
    const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"].includes(ext) || file.type.startsWith("image/");

    if (!isCSV && !isPDF && !isImage) {
      return NextResponse.json({ 
        error: "Unsupported format. Please upload CSV, PDF, JPG, or PNG files." 
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text: string;
    if (isCSV) {
      text = buffer.toString("utf-8");
    } else if (isPDF) {
      text = await extractTextFromPDF(buffer);
    } else {
      text = await extractTextFromImage(buffer);
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: `Could not extract data from ${isCSV ? "CSV" : isPDF ? "PDF" : "image"}. ${isImage ? "Try a clearer image." : isPDF ? "It may be a scanned PDF — try converting to image first." : "Check that the file is not empty."}` },
        { status: 400 }
      );
    }

    const parsed = isCSV ? parseTransactionsFromCSV(text) : parseTransactionsFromText(text);

    if (parsed.length === 0) {
      return NextResponse.json({ 
        error: "No transactions found in the file. Make sure it contains dates, descriptions, and amounts.",
        textPreview: text.substring(0, 500) 
      }, { status: 400 });
    }

    let imported = 0;
    let duplicates = 0;
    let needsReview = 0;
    const allCandidates: {
      userId: string; merchant: string; amount: number; type: string;
      category: string; paymentMethod: string; date: Date; notes: string | null;
    }[] = [];

    for (const txn of parsed) {
      const date = parseDate(txn.date);
      if (!date) { needsReview++; continue; }
      if (isNaN(txn.amount) || txn.amount === 0) { needsReview++; continue; }

      allCandidates.push({
        userId, merchant: txn.merchant, amount: txn.amount, type: txn.type,
        category: categorizeMerchant(txn.merchant), paymentMethod: "Bank Transfer",
        date, notes: `Imported from ${isCSV ? "CSV" : isPDF ? "PDF" : "image"}`,
      });
    }

    if (allCandidates.length > 0) {
      // Batch deduplication: find all existing transactions for this user in one query
      const existingTxs = await prisma.transaction.findMany({
        where: {
          userId,
          OR: allCandidates.map((t) => ({
            merchant: t.merchant, date: t.date, amount: t.amount,
          })),
        },
        select: { merchant: true, date: true, amount: true },
      });

      // Build a Set of existing transaction keys for O(1) lookup
      const existingKeys = new Set(
        existingTxs.map((t) => `${t.merchant}|${t.date.toISOString()}|${t.amount}`)
      );

      const newTransactions = allCandidates.filter((t) => {
        const key = `${t.merchant}|${t.date.toISOString()}|${t.amount}`;
        if (existingKeys.has(key)) { duplicates++; return false; }
        return true;
      });

      if (newTransactions.length > 0) {
        await prisma.transaction.createMany({ data: newTransactions });
        imported = newTransactions.length;
      }
    }

    return NextResponse.json({
      summary: { total: parsed.length, imported, duplicates, needsReview },
    });
  } catch (error) {
    console.error("File import error:", error);
    return NextResponse.json({ error: "Import failed. Please check the file format and try again." }, { status: 500 });
  }
}
