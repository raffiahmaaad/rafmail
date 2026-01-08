import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userMailboxSessions } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";
import { headers } from "next/headers";
import crypto from "crypto";

// Session duration: 1 day
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * GET: Get valid session for a specific email
 * Security: Only returns session if user owns it
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find valid session for this user and email
    const mailboxSession = await db
      .select()
      .from(userMailboxSessions)
      .where(
        and(
          eq(userMailboxSessions.userId, session.user.id),
          eq(userMailboxSessions.email, email.toLowerCase()),
          gt(userMailboxSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (mailboxSession.length === 0) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        token: mailboxSession[0].sessionToken,
        expiresAt: mailboxSession[0].expiresAt.getTime(),
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create or update mailbox session
 * Security: Uses cryptographically secure random token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const sessionToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    // Delete any existing sessions for this user+email
    await db
      .delete(userMailboxSessions)
      .where(
        and(
          eq(userMailboxSessions.userId, session.user.id),
          eq(userMailboxSessions.email, normalizedEmail)
        )
      );

    // Create new session
    await db.insert(userMailboxSessions).values({
      userId: session.user.id,
      email: normalizedEmail,
      sessionToken,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt: expiresAt.getTime(),
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove session for an email
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await db
      .delete(userMailboxSessions)
      .where(
        and(
          eq(userMailboxSessions.userId, session.user.id),
          eq(userMailboxSessions.email, email.toLowerCase())
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
