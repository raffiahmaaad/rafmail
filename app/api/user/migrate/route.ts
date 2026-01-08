import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  userAddresses,
  userEmailHistory,
  userPreferences,
  userDomains,
} from "@/lib/schema";
import { headers } from "next/headers";

interface MigrationData {
  tokens?: Record<string, string>; // email -> token
  history?: string[];
  currentAddress?: string;
  domains?: string[];
  defaultRetention?: number;
}

/**
 * POST: Migrate localStorage data to database
 * This is called once when a user logs in to migrate their guest data
 * Security: Only authenticated users can migrate, data is validated
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data: MigrationData = await request.json();
    const userId = session.user.id;
    let migratedCount = 0;

    // Migrate tokens (email addresses with recovery tokens)
    if (data.tokens && typeof data.tokens === "object") {
      for (const [email, token] of Object.entries(data.tokens)) {
        if (email && email.includes("@") && token) {
          try {
            await db
              .insert(userAddresses)
              .values({
                userId,
                email: email.toLowerCase(),
                recoveryToken: token,
                retentionSeconds: -1, // Permanent for logged-in users
              })
              .onConflictDoNothing();
            migratedCount++;
          } catch (e) {
            console.error(`Failed to migrate email ${email}:`, e);
          }
        }
      }
    }

    // Migrate history
    if (data.history && Array.isArray(data.history)) {
      for (const email of data.history) {
        if (email && email.includes("@")) {
          try {
            await db
              .insert(userEmailHistory)
              .values({
                userId,
                email: email.toLowerCase(),
              })
              .onConflictDoNothing();
          } catch (e) {
            console.error(`Failed to migrate history ${email}:`, e);
          }
        }
      }
    }

    // Migrate domains
    if (data.domains && Array.isArray(data.domains)) {
      for (const domain of data.domains) {
        // Skip default domain
        if (domain && domain !== "rafxyz.web.id") {
          try {
            await db
              .insert(userDomains)
              .values({
                userId,
                domain: domain.toLowerCase(),
                verified: false,
              })
              .onConflictDoNothing();
          } catch (e) {
            console.error(`Failed to migrate domain ${domain}:`, e);
          }
        }
      }
    }

    // Migrate preferences
    if (data.defaultRetention !== undefined || data.currentAddress) {
      try {
        await db
          .insert(userPreferences)
          .values({
            userId,
            defaultRetention: data.defaultRetention ?? -1,
            currentAddress: data.currentAddress || null,
          })
          .onConflictDoUpdate({
            target: userPreferences.userId,
            set: {
              ...(data.defaultRetention !== undefined && {
                defaultRetention: data.defaultRetention,
              }),
              ...(data.currentAddress && { currentAddress: data.currentAddress }),
              updatedAt: new Date(),
            },
          });
      } catch (e) {
        console.error("Failed to migrate preferences:", e);
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      message: `Migrated ${migratedCount} email addresses to your account`,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Failed to migrate data" },
      { status: 500 }
    );
  }
}
