import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { categorizeMerchant, parseSingleSMS, parseSmsDate } from "@/lib/sms-parser";

/**
 * Automatic capture of bank / UPI SMS.
 *
 * UPI has no API that lets an app read a personal UPI ID's history, but every
 * UPI payment — from GPay, PhonePe, Paytm, or any bank app — produces an SMS
 * from the bank. A forwarder on the phone posts that SMS here and the
 * transaction lands in the app without any manual import.
 *
 * Auth is a per-user token (Settings → Automatic UPI capture), not the session
 * JWT, because the forwarder runs in the background and cannot log in.
 *
 * Accepts POST (JSON `{message}` or a raw text body) and GET (`?message=...`)
 * because some forwarder apps only support GET webhooks.
 */

const MAX_LENGTH = 2000;
const MAX_MESSAGES = 20;

function tokenFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("x-ingest-token");
  if (header?.trim()) return header.trim();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const value = auth.substring(7).trim();
    // Session JWTs have three dot-separated segments; the ingest token never
    // does, so a bearer token here can safely be treated as one.
    if (value.split(".").length !== 3) return value;
  }

  const query = req.nextUrl.searchParams.get("token");
  return query?.trim() || null;
}

async function readMessages(req: NextRequest): Promise<string[]> {
  const params = req.nextUrl.searchParams;
  const fromQuery = params.get("message") ?? params.get("text") ?? params.get("sms");
  if (fromQuery) return [fromQuery];

  if (req.method === "GET") return [];

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let body: { message?: unknown; text?: unknown; messages?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return [];
    }
    if (Array.isArray(body.messages)) {
      return body.messages.filter((m): m is string => typeof m === "string");
    }
    const single = body.message ?? body.text;
    return typeof single === "string" ? [single] : [];
  }

  // Plain text body: one message per line.
  const raw = await req.text();
  return raw.split("\n").filter((line) => line.trim());
}

async function handle(req: NextRequest) {
  const token = tokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { error: "Missing ingest token. Send it as x-ingest-token or ?token=." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { ingestToken: token },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "This ingest token is not valid. Generate a new one in Settings." },
      { status: 401 }
    );
  }

  const raw = await readMessages(req);
  const messages = raw
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
    .slice(0, MAX_MESSAGES);

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "No message provided. Send {message: \"...\"} or ?message=..." },
      { status: 400 }
    );
  }

  const tooLong = messages.some((m) => m.length > MAX_LENGTH);
  if (tooLong) {
    return NextResponse.json({ error: "Message too long." }, { status: 400 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  const parsed = [];
  const skipped: string[] = [];
  for (const sms of messages) {
    const result = parseSingleSMS(sms);
    if (result) parsed.push(result);
    else skipped.push(sms.substring(0, 80));
  }

  // Previews are useful even when nothing was inserted (dry run, or all dupes).
  const preview = parsed.map((t) => ({
    merchant: t.merchant,
    amount: t.amount,
    type: t.type,
    date: t.date,
    upiRef: t.upiRef,
  }));

  if (parsed.length === 0) {
    return NextResponse.json({
      summary: { total: messages.length, parsed: 0, imported: 0, duplicates: 0, needsReview: 0 },
      transactions: [],
      skipped,
    });
  }

  const candidates = [];
  let needsReview = 0;
  for (const txn of parsed) {
    const date = parseSmsDate(txn.date);
    if (!date || isNaN(txn.amount) || txn.amount === 0) {
      needsReview++;
      continue;
    }
    candidates.push({
      merchant: txn.merchant,
      amount: txn.amount,
      type: txn.type,
      category: categorizeMerchant(txn.merchant),
      date,
      upiRef: txn.upiRef,
      notes: txn.upiRef
        ? `UPI Ref: ${txn.upiRef} | Auto-captured from SMS`
        : "Auto-captured from SMS",
    });
  }

  if (candidates.length === 0 || dryRun) {
    return NextResponse.json({
      summary: {
        total: messages.length,
        parsed: parsed.length,
        imported: 0,
        duplicates: 0,
        needsReview,
        dryRun,
      },
      transactions: preview,
      skipped,
    });
  }

  // One query for every merchant/date/amount and UPI ref we are about to add.
  const conditions = [
    ...candidates.map((t) => ({ userId: user.id, merchant: t.merchant, date: t.date, amount: t.amount })),
    ...candidates
      .filter((t) => t.upiRef)
      .map((t) => ({ userId: user.id, notes: { contains: t.upiRef } })),
  ];

  const existing = await prisma.transaction.findMany({
    where: { OR: conditions },
    select: { merchant: true, date: true, amount: true, notes: true },
  });

  const existingKeys = new Set(
    existing.map((t) => `${t.merchant}|${t.date.toISOString()}|${t.amount}`)
  );
  const existingRefs = new Set(
    existing
      .filter((t) => t.notes)
      .flatMap((t) => {
        const match = t.notes?.match(/UPI Ref: (\w+)/);
        return match ? [match[1]] : [];
      })
  );

  let duplicates = 0;
  const toInsert = candidates.filter((t) => {
    const key = `${t.merchant}|${t.date.toISOString()}|${t.amount}`;
    if (existingKeys.has(key)) {
      duplicates++;
      return false;
    }
    if (t.upiRef && existingRefs.has(t.upiRef)) {
      duplicates++;
      return false;
    }
    return true;
  });

  if (toInsert.length > 0) {
    await prisma.transaction.createMany({
      data: toInsert.map(({ upiRef, ...rest }) => ({
        ...rest,
        userId: user.id,
        paymentMethod: "UPI",
      })),
    });
  }

  return NextResponse.json({
    summary: {
      total: messages.length,
      parsed: parsed.length,
      imported: toInsert.length,
      duplicates,
      needsReview,
    },
    transactions: preview,
    skipped,
  });
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (error) {
    console.error("SMS ingest error:", error);
    return NextResponse.json({ error: "Could not capture the message." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handle(req);
  } catch (error) {
    console.error("SMS ingest error:", error);
    return NextResponse.json({ error: "Could not capture the message." }, { status: 500 });
  }
}
