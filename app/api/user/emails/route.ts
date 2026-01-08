import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAddresses } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * GET: Get all emails for authenticated user (sorted by newest first)
 * Security: Only returns emails owned by the authenticated user
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emails = await db
      .select({
        email: userAddresses.email,
        recoveryToken: userAddresses.recoveryToken,
        retentionSeconds: userAddresses.retentionSeconds,
        createdAt: userAddresses.createdAt,
      })
      .from(userAddresses)
      .where(eq(userAddresses.userId, session.user.id))
      .orderBy(desc(userAddresses.createdAt));

    return NextResponse.json({
      emails: emails.map((e) => ({
        email: e.email,
        recoveryToken: e.recoveryToken,
        retentionSeconds: e.retentionSeconds,
      })),
    });
  } catch (error) {
    console.error("Get user emails error:", error);
    return NextResponse.json(
      { error: "Failed to get emails" },
      { status: 500 }
    );
  }
}

/**
 * POST: Associate email with user account
 * Security: Validates user session and email format
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, recoveryToken, retentionSeconds } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Upsert - update if exists, insert if not
    await db
      .insert(userAddresses)
      .values({
        userId: session.user.id,
        email: email.toLowerCase(),
        recoveryToken: recoveryToken || null,
        retentionSeconds: retentionSeconds ?? -1, // Default permanent for logged-in
      })
      .onConflictDoUpdate({
        target: [userAddresses.userId, userAddresses.email],
        set: {
          recoveryToken: recoveryToken || null,
          ...(retentionSeconds !== undefined && { retentionSeconds }),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Associate email error:", error);
    return NextResponse.json(
      { error: "Failed to associate email" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete email from user account
 * Security: Only deletes emails owned by the authenticated user
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

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await db
      .delete(userAddresses)
      .where(
        eq(userAddresses.userId, session.user.id) &&
          eq(userAddresses.email, email.toLowerCase())
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete email error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
