import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";

// Session duration: 1 day
const SESSION_TTL = 24 * 60 * 60; // 1 day in seconds

// POST - Verify recovery key and create session
export async function POST(request: NextRequest) {
  try {
    const { email, recoveryKey } = await request.json();

    if (!email || !recoveryKey) {
      return NextResponse.json(
        { error: "Email and recovery key are required" },
        { status: 400 }
      );
    }

    // Parse recovery key to get tokenId
    const [tokenId] = recoveryKey.split(".");
    if (!tokenId) {
      return NextResponse.json(
        { error: "Invalid recovery key format" },
        { status: 400 }
      );
    }

    // Lookup recovery key in Redis
    const tokenKey = `recovery:${tokenId}`;
    const storedEmail = await redis.get(tokenKey);

    if (!storedEmail) {
      return NextResponse.json(
        { error: "Recovery key expired or invalid" },
        { status: 401 }
      );
    }

    // Verify email matches
    const normalizedEmail = email.toLowerCase();
    const normalizedStoredEmail = (storedEmail as string).toLowerCase();

    if (normalizedEmail !== normalizedStoredEmail) {
      return NextResponse.json(
        { error: "Recovery key does not match this email" },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("base64url");

    // Store session in Redis with 1 day TTL
    const sessionKey = `mailbox-session:${sessionToken}`;
    await redis.set(sessionKey, normalizedEmail);
    await redis.expire(sessionKey, SESSION_TTL);

    // Also store a reverse lookup: email -> session (for invalidation if needed)
    const emailSessionKey = `email-session:${normalizedEmail}`;
    await redis.set(emailSessionKey, sessionToken);
    await redis.expire(emailSessionKey, SESSION_TTL);

    return NextResponse.json({
      success: true,
      sessionToken,
      email: normalizedEmail,
      expiresIn: SESSION_TTL,
    });
  } catch (error) {
    console.error("Verify access error:", error);
    return NextResponse.json(
      { error: "Failed to verify access" },
      { status: 500 }
    );
  }
}

// GET - Check if session is valid for an email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const session = searchParams.get("session");

    if (!email || !session) {
      return NextResponse.json(
        { verified: false, error: "Email and session required" },
        { status: 400 }
      );
    }

    // Lookup session in Redis
    const sessionKey = `mailbox-session:${session}`;
    const storedEmail = await redis.get(sessionKey);

    if (!storedEmail) {
      return NextResponse.json({ verified: false, reason: "expired" });
    }

    // Verify email matches session
    const normalizedEmail = email.toLowerCase();
    const normalizedStoredEmail = (storedEmail as string).toLowerCase();

    if (normalizedEmail !== normalizedStoredEmail) {
      return NextResponse.json({ verified: false, reason: "mismatch" });
    }

    return NextResponse.json({ verified: true, email: normalizedEmail });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ verified: false, error: "Check failed" });
  }
}
