import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * GET: Get user preferences
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    if (prefs.length === 0) {
      // Return defaults for logged-in users
      return NextResponse.json({
        preferences: {
          defaultRetention: -1, // Permanent for logged-in users
          currentAddress: null,
        },
      });
    }

    return NextResponse.json({
      preferences: {
        defaultRetention: prefs[0].defaultRetention,
        currentAddress: prefs[0].currentAddress,
      },
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json(
      { error: "Failed to get preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST: Update user preferences
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { defaultRetention, currentAddress } = await request.json();

    // Upsert preferences
    await db
      .insert(userPreferences)
      .values({
        userId: session.user.id,
        defaultRetention: defaultRetention ?? -1,
        currentAddress: currentAddress ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...(defaultRetention !== undefined && { defaultRetention }),
          ...(currentAddress !== undefined && { currentAddress }),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
