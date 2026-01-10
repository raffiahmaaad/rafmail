import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { userAddresses } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Helper to verify admin access
 */
async function checkAdminAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  
  if (!sessionToken) {
    return false;
  }

  return await verifyAdminSession(sessionToken);
}

/**
 * GET - List all email addresses in the system
 */
export async function GET() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Get all emails from database (registered users)
    const dbEmails = await db.select().from(userAddresses);
    console.log("DB emails found:", dbEmails.length);
    
    // Get all inbox keys from Redis using scan (Upstash compatible)
    let redisKeys: string[] = [];
    try {
      // Try keys first
      const keys = await redis.keys("inbox:*");
      if (Array.isArray(keys)) {
        redisKeys = keys;
      }
    } catch (redisError) {
      console.error("Redis keys error:", redisError);
      // Fallback: try scan
      try {
        let cursor: number | string = 0;
        do {
          const result: [number | string, string[]] = await redis.scan(cursor, { match: "inbox:*", count: 100 }) as [number | string, string[]];
          cursor = result[0];
          redisKeys.push(...result[1]);
        } while (cursor !== 0 && cursor !== "0");
      } catch (scanError) {
        console.error("Redis scan error:", scanError);
      }
    }
    console.log("Redis keys found:", redisKeys.length);
    
    // Combine and deduplicate
    const emailSet = new Set<string>();
    const emailsData: Array<{
      address: string;
      source: "user" | "guest";
      userId?: string;
      createdAt?: string;
    }> = [];

    // Add database emails
    for (const email of dbEmails) {
      emailSet.add(email.email.toLowerCase());
      emailsData.push({
        address: email.email,
        source: "user",
        userId: email.userId,
        createdAt: email.createdAt.toISOString(),
      });
    }

    // Add Redis-only emails (guests)
    for (const key of redisKeys) {
      const address = key.replace("inbox:", "");
      if (!emailSet.has(address.toLowerCase())) {
        emailsData.push({
          address,
          source: "guest",
        });
      }
    }

    // Sort by address
    emailsData.sort((a, b) => a.address.localeCompare(b.address));

    console.log("Total emails:", emailsData.length);
    return NextResponse.json({ emails: emailsData });
  } catch (error) {
    console.error("Admin emails list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an email address and ALL related data (complete cleanup)
 * Deletes from PostgreSQL: userAddresses, userEmailHistory, userMailboxSessions
 * Deletes from Redis: inbox, settings, email:token, recovery:tokenId, email-session, mailbox-session
 */
export async function DELETE(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Import additional schemas dynamically to avoid circular deps
    const { userEmailHistory, userMailboxSessions } = await import("@/lib/schema");

    // Delete from all PostgreSQL tables
    await Promise.all([
      db.delete(userAddresses).where(eq(userAddresses.email, normalizedAddress)),
      db.delete(userEmailHistory).where(eq(userEmailHistory.email, normalizedAddress)),
      db.delete(userMailboxSessions).where(eq(userMailboxSessions.email, normalizedAddress)),
    ]);

    // ========================================
    // COMPLETE REDIS CLEANUP (All 6 keys)
    // ========================================
    
    // Keys that can be deleted directly
    const directKeys = [
      `inbox:${normalizedAddress}`,           // 1. Email inbox
      `settings:${normalizedAddress}`,        // 2. Email settings  
      `email:${normalizedAddress}:token`,     // 3. Recovery token (by email)
      `email-session:${normalizedAddress}`,   // 4. Email session mapping
    ];

    // Lookup keys that need to be retrieved first before deletion
    const additionalKeysToDelete: string[] = [];
    
    // 5. Get recovery token to find and delete recovery:${tokenId}
    const recoveryToken = await redis.get(`email:${normalizedAddress}:token`);
    if (recoveryToken && typeof recoveryToken === 'string') {
      const [tokenId] = recoveryToken.split('.');
      if (tokenId) {
        additionalKeysToDelete.push(`recovery:${tokenId}`);
      }
    }

    // 6. Get session token to find and delete mailbox-session:${sessionToken}
    const sessionToken = await redis.get(`email-session:${normalizedAddress}`);
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
    console.error("Admin email delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}

