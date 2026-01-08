import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAddresses, userEmailHistory, userMailboxSessions } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";

/**
 * GET: Get all emails for authenticated user (sorted by newest first)
 * Security: Only returns emails owned by the authenticated user
 * Auto-cleanup: Removes emails that no longer exist in Redis
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
        id: userAddresses.id,
        email: userAddresses.email,
        recoveryToken: userAddresses.recoveryToken,
        retentionSeconds: userAddresses.retentionSeconds,
        createdAt: userAddresses.createdAt,
      })
      .from(userAddresses)
      .where(eq(userAddresses.userId, session.user.id))
      .orderBy(desc(userAddresses.createdAt));

    // Check which emails still have inbox data in Redis
    const validEmails: typeof emails = [];
    const orphanedEmailIds: string[] = [];

    for (const e of emails) {
      const inboxKey = `inbox:${e.email.toLowerCase()}`;
      const exists = await redis.exists(inboxKey);
      
      if (exists) {
        validEmails.push(e);
      } else {
        // Mark for cleanup
        orphanedEmailIds.push(e.id);
      }
    }

    // Cleanup orphaned emails from PostgreSQL (async, don't wait)
    if (orphanedEmailIds.length > 0) {
      Promise.all(
        orphanedEmailIds.map((id) =>
          db.delete(userAddresses).where(
            and(
              eq(userAddresses.id, id),
              eq(userAddresses.userId, session.user.id)
            )
          )
        )
      ).catch((err) => console.error("Orphan cleanup error:", err));
    }

    return NextResponse.json({
      emails: validEmails.map((e) => ({
        email: e.email,
        recoveryToken: e.recoveryToken,
        retentionSeconds: e.retentionSeconds,
      })),
      cleaned: orphanedEmailIds.length, // Info about how many were cleaned
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
 * Full cleanup: Removes from PostgreSQL (addresses, history, sessions) AND Redis
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

    const normalizedEmail = email.toLowerCase();
    const userId = session.user.id;

    // Delete from all PostgreSQL tables
    await Promise.all([
      // Delete from user_addresses
      db.delete(userAddresses).where(
        and(
          eq(userAddresses.userId, userId),
          eq(userAddresses.email, normalizedEmail)
        )
      ),
      // Delete from user_email_history
      db.delete(userEmailHistory).where(
        and(
          eq(userEmailHistory.userId, userId),
          eq(userEmailHistory.email, normalizedEmail)
        )
      ),
      // Delete from user_mailbox_sessions
      db.delete(userMailboxSessions).where(
        and(
          eq(userMailboxSessions.userId, userId),
          eq(userMailboxSessions.email, normalizedEmail)
        )
      ),
    ]);

    // Also delete all related Redis keys
    const keysToDelete = [
      `inbox:${normalizedEmail}`,           // Email inbox
      `settings:${normalizedEmail}`,        // Email settings  
      `email:${normalizedEmail}:token`,     // Recovery token
    ];

    // Delete each Redis key (some might not exist, that's ok)
    await Promise.all(
      keysToDelete.map((key) => redis.del(key).catch(() => {}))
    );

    return NextResponse.json({ 
      success: true, 
      deletedFromPostgres: ['userAddresses', 'userEmailHistory', 'userMailboxSessions'],
      deletedRedisKeys: keysToDelete 
    });
  } catch (error) {
    console.error("Delete email error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
