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

    // Return all emails from PostgreSQL directly
    // Note: The inbox:${email} key in Redis is only created when actual emails are received
    // via webhook. Newly generated emails don't have inbox data yet, so we should NOT
    // filter them out or treat them as orphaned.
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

    // ========================================
    // COMPLETE REDIS CLEANUP (All 6 keys)
    // ========================================
    
    // Keys that can be deleted directly
    const directKeys = [
      `inbox:${normalizedEmail}`,           // 1. Email inbox
      `settings:${normalizedEmail}`,        // 2. Email settings  
      `email:${normalizedEmail}:token`,     // 3. Recovery token (by email)
      `email-session:${normalizedEmail}`,   // 4. Email session mapping
    ];

    // Lookup keys that need to be retrieved first before deletion
    const additionalKeysToDelete: string[] = [];
    
    // 5. Get recovery token to find and delete recovery:${tokenId}
    const recoveryToken = await redis.get(`email:${normalizedEmail}:token`);
    if (recoveryToken && typeof recoveryToken === 'string') {
      const [tokenId] = recoveryToken.split('.');
      if (tokenId) {
        additionalKeysToDelete.push(`recovery:${tokenId}`);
      }
    }

    // 6. Get session token to find and delete mailbox-session:${sessionToken}
    const sessionToken = await redis.get(`email-session:${normalizedEmail}`);
    if (sessionToken && typeof sessionToken === 'string') {
      additionalKeysToDelete.push(`mailbox-session:${sessionToken}`);
    }

    // Combine all keys to delete
    const allKeysToDelete = [...directKeys, ...additionalKeysToDelete];

    // Delete all Redis keys (some might not exist, that's ok)
    await Promise.all(
      allKeysToDelete.map((key) => redis.del(key).catch(() => {}))
    );

    return NextResponse.json({ 
      success: true, 
      deletedFromPostgres: ['userAddresses', 'userEmailHistory', 'userMailboxSessions'],
      deletedRedisKeys: allKeysToDelete 
    });
  } catch (error) {
    console.error("Delete email error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
