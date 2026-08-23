import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "spendwise-dev-secret-key-2024";

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export function signToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  // Check cookies
  const token = req.cookies.get("token")?.value;
  return token || null;
}

export function getUserFromRequest(req: NextRequest): string | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}
