import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userEmailHistory } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";

const MAX_HISTORY_ITEMS = 20;

/**
 * GET: Get user's email history (most recent first)
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

    const history = await db
      .select({
        id: userEmailHistory.id,
        email: userEmailHistory.email,
        createdAt: userEmailHistory.createdAt,
      })
      .from(userEmailHistory)
      .where(eq(userEmailHistory.userId, session.user.id))
      .orderBy(desc(userEmailHistory.createdAt))
      .limit(MAX_HISTORY_ITEMS);

    // Check which emails still have inbox data in Redis
    const validHistory: typeof history = [];
    const orphanedIds: string[] = [];

    for (const h of history) {
      const inboxKey = `inbox:${h.email.toLowerCase()}`;
      const exists = await redis.exists(inboxKey);
      
      if (exists) {
        validHistory.push(h);
      } else {
        orphanedIds.push(h.id);
      }
    }

    // Cleanup orphaned history from PostgreSQL (async, don't wait)
    if (orphanedIds.length > 0) {
      Promise.all(
        orphanedIds.map((id) =>
          db.delete(userEmailHistory).where(
            and(
              eq(userEmailHistory.id, id),
              eq(userEmailHistory.userId, session.user.id)
            )
          )
        )
      ).catch((err) => console.error("History orphan cleanup error:", err));
    }

    return NextResponse.json({
      history: validHistory.map((h) => h.email),
      cleaned: orphanedIds.length,
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json(
      { error: "Failed to get history" },
      { status: 500 }
    );
  }
}

/**
 * POST: Add email to history
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

    // Upsert - update createdAt if exists, insert if not
    await db
      .insert(userEmailHistory)
      .values({
        userId: session.user.id,
        email: email.toLowerCase(),
      })
      .onConflictDoUpdate({
        target: [userEmailHistory.userId, userEmailHistory.email],
        set: { createdAt: new Date() },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add history error:", error);
    return NextResponse.json(
      { error: "Failed to add to history" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove email from history or clear all
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, clearAll } = await request.json();

    if (clearAll) {
      // Clear all history for user
      await db
        .delete(userEmailHistory)
        .where(eq(userEmailHistory.userId, session.user.id));
    } else if (email) {
      // Delete specific email from history
      await db
        .delete(userEmailHistory)
        .where(
          eq(userEmailHistory.userId, session.user.id) &&
            eq(userEmailHistory.email, email.toLowerCase())
        );
    } else {
      return NextResponse.json(
        { error: "Email or clearAll required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete history error:", error);
    return NextResponse.json(
      { error: "Failed to delete history" },
      { status: 500 }
    );
  }
}
