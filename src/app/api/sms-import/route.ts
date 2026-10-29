import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import {
  categorizeMerchant,
  parseSingleSMS,
  parseSmsDate,
  type ParsedTransaction,
} from "@/lib/sms-parser";

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
    const allCandidates: {
      userId: string; merchant: string; amount: number; type: string;
      category: string; paymentMethod: string; date: Date; notes: string | null;
      upiRef: string;
    }[] = [];

    for (const txn of parsed) {
      const date = parseSmsDate(txn.date);
      if (!date) { needsReview++; continue; }
      if (isNaN(txn.amount) || txn.amount === 0) { needsReview++; continue; }

      const note = txn.upiRef
        ? `UPI Ref: ${txn.upiRef} | Imported from SMS`
        : "Imported from SMS";

      allCandidates.push({
        userId, merchant: txn.merchant, amount: txn.amount, type: txn.type,
        category: categorizeMerchant(txn.merchant), paymentMethod: "UPI",
        date, notes: note, upiRef: txn.upiRef,
      });
    }

    if (allCandidates.length > 0) {
      // Batch deduplication: one query for all merchant+date+amount matches
      const detailConditions = allCandidates.map((t) => ({
        userId, merchant: t.merchant, date: t.date, amount: t.amount,
      }));

      // Also batch-check UPI refs
      const upiRefs = allCandidates.filter((t) => t.upiRef).map((t) => t.upiRef);
      const refConditions = upiRefs.map((ref) => ({
        userId, notes: { contains: ref },
      }));

      const allConditions = [...detailConditions, ...refConditions];
      const existingTxs = allConditions.length > 0
        ? await prisma.transaction.findMany({
            where: { OR: allConditions },
            select: { merchant: true, date: true, amount: true, notes: true },
          })
        : [];

      // Build lookup sets
      const existingDetailKeys = new Set(
        existingTxs.map((t) => `${t.merchant}|${t.date.toISOString()}|${t.amount}`)
      );
      const existingRefSet = new Set(
        existingTxs.filter((t) => t.notes).flatMap((t) => {
          const match = t.notes?.match(/UPI Ref: (\w+)/);
          return match ? [match[1]] : [];
        })
      );

      const newTransactions = allCandidates.filter((t) => {
        const detailKey = `${t.merchant}|${t.date.toISOString()}|${t.amount}`;
        if (existingDetailKeys.has(detailKey)) { duplicates++; return false; }
        if (t.upiRef && existingRefSet.has(t.upiRef)) { duplicates++; return false; }
        return true;
      });

      if (newTransactions.length > 0) {
        const toInsert = newTransactions.map(({ upiRef, ...rest }) => rest);
        await prisma.transaction.createMany({ data: toInsert });
        imported = newTransactions.length;
      }
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
