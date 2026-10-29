import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Pulls UPI transactions from the account owner's Razorpay merchant account.
 *
 * Razorpay's "Fetch All Payments" endpoint is the only mainstream provider API
 * that lists a whole account's payments (Cashfree/PhonePe/Paytm only look up a
 * single known order), and its payment entity carries the payer VPA plus the
 * UPI transaction id/RRN, which is what the app needs to import and re-sync
 * without creating duplicates.
 */

const RAZORPAY_PAYMENTS_URL = `${process.env.RAZORPAY_API_BASE || "https://api.razorpay.com"}/v1/payments`;
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // safety cap: 1000 payments per import

// Razorpay rejects `from` outside this window:
// "from must be between 946684800 and 4765046400"
const MIN_UNIX = 946684800; // 2000-01-01
const MAX_UNIX = 4765046400; // 2120-01-01

interface RazorpayPayment {
  id: string;
  entity: string;
  method: string;
  status: string;
  amount: number;
  amount_refunded?: number;
  currency?: string;
  vpa?: string | null;
  upi?: { vpa?: string; payer_account_type?: string; flow?: string };
  description?: string | null;
  email?: string | null;
  contact?: string | null;
  acquirer_data?: { rrn?: string; upi_transaction_id?: string };
  created_at: number;
}

function razorpayKeys(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

/**
 * Tells the UI whether a Razorpay account is connected, so the import modal can
 * show a working alternative instead of a button that always fails with 400.
 */
export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ configured: razorpayKeys() !== null, provider: "razorpay" });
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function fetchUpiPayments(
  keyId: string,
  keySecret: string,
  fromUnix: number,
  toUnix: number
): Promise<RazorpayPayment[]> {
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const collected: RazorpayPayment[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(RAZORPAY_PAYMENTS_URL);
    url.searchParams.set("from", String(fromUnix));
    url.searchParams.set("to", String(toUnix));
    url.searchParams.set("count", String(PAGE_SIZE));
    url.searchParams.set("skip", String(page * PAGE_SIZE));

    const res = await fetch(url.toString(), {
      headers: { Authorization: auth },
      cache: "no-store",
    });

    if (res.status === 401) {
      throw new Error("Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }
    if (res.status === 403) {
      throw new Error("The Razorpay account is not authorised for the Payments API.");
    }
    if (!res.ok) {
      throw new Error(`Razorpay responded with HTTP ${res.status} while fetching payments.`);
    }

    const data = (await res.json()) as { items?: RazorpayPayment[]; count?: number };
    const items = Array.isArray(data.items) ? data.items : [];

    // The Payments API has no `method` filter, so filter client-side.
    collected.push(...items.filter((item) => item.method === "upi"));

    if (items.length < PAGE_SIZE) break;
  }

  return collected;
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const keys = razorpayKeys();
    if (!keys) {
      return NextResponse.json(
        {
          error:
            "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env, then restart the dev server.",
        },
        { status: 400 }
      );
    }

    let body: { from?: string; to?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const to = parseIsoDate(body.to) ?? new Date();
    const from =
      parseIsoDate(body.from) ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (from.getTime() > to.getTime()) {
      return NextResponse.json({ error: "The start date must be before the end date." }, { status: 400 });
    }

    // Clamp to the window Razorpay accepts.
    const fromUnix = Math.max(MIN_UNIX, Math.floor(from.getTime() / 1000));
    const toUnix = Math.min(MAX_UNIX, Math.ceil(to.getTime() / 1000));

    let payments: RazorpayPayment[];
    try {
      payments = await fetchUpiPayments(keys.keyId, keys.keySecret, fromUnix, toUnix);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reach Razorpay.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    if (payments.length === 0) {
      return NextResponse.json({
        summary: { total: 0, imported: 0, duplicates: 0, needsReview: 0 },
        transactions: [],
      });
    }

    // Skip payments that never moved money: failures and full refunds.
    const candidates = payments.filter(
      (p) => p.status !== "failed" && p.status !== "refunded"
    );
    let needsReview = payments.length - candidates.length;

    // Dedupe on the Razorpay payment id, which is stored in `notes`.
    const existingNotes = await prisma.transaction.findMany({
      where: {
        userId,
        OR: candidates.map((p) => ({ notes: { contains: p.id } })),
      },
      select: { notes: true },
    });
    const knownNotes = existingNotes.map((t) => t.notes || "");
    const isDuplicate = (id: string) => knownNotes.some((note) => note.includes(id));

    let duplicates = 0;
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
    const importedPreview: {
      merchant: string;
      amount: number;
      type: string;
      date: string;
      upiRef: string;
    }[] = [];

    for (const p of candidates) {
      if (isDuplicate(p.id)) {
        duplicates++;
        continue;
      }

      const amount = Math.max(0, (p.amount ?? 0) - (p.amount_refunded ?? 0)) / 100;
      if (!Number.isFinite(amount) || amount === 0) {
        needsReview++;
        continue;
      }
      if (!Number.isFinite(p.created_at)) {
        needsReview++;
        continue;
      }

      const payerVpa = p.vpa || p.upi?.vpa || null;
      const merchant = (payerVpa || p.email || p.contact || p.description || "UPI Collection").substring(0, 200);
      const upiRef = p.acquirer_data?.upi_transaction_id || p.acquirer_data?.rrn || "";
      const date = new Date(p.created_at * 1000);
      const notes = `UPI${payerVpa ? ` ${payerVpa}` : ""} · ${p.id}${upiRef ? ` · UTR ${upiRef}` : ""}`;

      newTransactions.push({
        userId,
        merchant,
        amount,
        type: "income",
        category: "Income",
        paymentMethod: "UPI",
        date,
        notes,
      });
      importedPreview.push({
        merchant,
        amount,
        type: "income",
        date: date.toISOString(),
        upiRef,
      });
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({ data: newTransactions });
    }

    return NextResponse.json({
      summary: {
        total: payments.length,
        imported: newTransactions.length,
        duplicates,
        needsReview,
      },
      transactions: importedPreview,
    });
  } catch (error) {
    console.error("UPI import error:", error);
    return NextResponse.json(
      { error: "Import failed while talking to Razorpay. Please try again." },
      { status: 500 }
    );
  }
}
