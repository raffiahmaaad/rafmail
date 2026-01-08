import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userEmailHistory } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

const MAX_HISTORY_ITEMS = 20;

/**
 * GET: Get user's email history (most recent first)
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
        email: userEmailHistory.email,
        createdAt: userEmailHistory.createdAt,
      })
      .from(userEmailHistory)
      .where(eq(userEmailHistory.userId, session.user.id))
      .orderBy(desc(userEmailHistory.createdAt))
      .limit(MAX_HISTORY_ITEMS);

    return NextResponse.json({
      history: history.map((h) => h.email),
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
