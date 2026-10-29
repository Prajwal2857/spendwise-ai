import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Long-lived token used by the phone-side SMS forwarder.
 *
 * This is deliberately separate from the session JWT: the forwarder runs in the
 * background on the phone and cannot log in, so it needs a credential that
 * survives for months and can be revoked here at any time.
 */
function generateToken(): string {
  return `sw_${randomBytes(24).toString("base64url")}`;
}

export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ingestToken: true },
  });

  return NextResponse.json({ token: user?.ingestToken ?? null });
}

export async function POST(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rotating invalidates the old token immediately, so a leaked one is useless.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateToken();
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { ingestToken: token },
        select: { ingestToken: true },
      });
      return NextResponse.json({ token: user.ingestToken });
    } catch (err) {
      // Collision on the unique index is astronomically unlikely; retry rather
      // than surfacing a confusing 500.
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        continue;
      }
      console.error("Ingest token error:", err);
      return NextResponse.json({ error: "Could not create a token" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not create a token" }, { status: 500 });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: userId }, data: { ingestToken: null } });
  return NextResponse.json({ token: null });
}
