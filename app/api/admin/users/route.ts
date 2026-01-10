import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { 
  user, 
  session as sessionTable, 
  account,
  userAddresses,
  userMailboxSessions,
  userEmailHistory,
  userDomains,
  userPreferences
} from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { redis } from "@/lib/redis";

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
 * GET - List all users with approval status
 */
export async function GET() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        approvalStatus: user.approvalStatus,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        approvedAt: user.approvedAt,
        approvedBy: user.approvedBy,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    // Separate pending users for easy access
    const pendingUsers = users.filter(u => u.approvalStatus === "pending");
    const approvedUsers = users.filter(u => u.approvalStatus === "approved");
    const rejectedUsers = users.filter(u => u.approvalStatus === "rejected");

    return NextResponse.json({
      users,
      stats: {
        total: users.length,
        pending: pendingUsers.length,
        approved: approvedUsers.length,
        rejected: rejectedUsers.length,
      },
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Approve or reject a user
 */
export async function PATCH(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId, action } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get user details for email
    const userResult = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userData = userResult[0];
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    await db
      .update(user)
      .set({
        approvalStatus: newStatus,
        approvedAt: action === "approve" ? new Date() : null,
        approvedBy: action === "approve" ? "admin" : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    // Send email notification to user
    const { sendApprovalEmail, sendRejectionEmail } = await import("@/lib/email");
    
    if (action === "approve") {
      await sendApprovalEmail(userData);
      console.log(`[Admin] Sent approval email to ${userData.email}`);
    } else {
      await sendRejectionEmail(userData);
      console.log(`[Admin] Sent rejection email to ${userData.email}`);
    }

    return NextResponse.json({
      success: true,
      userId,
      newStatus,
      emailSent: true,
    });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a user and all related data completely
 */
export async function DELETE(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    console.log(`[Admin] Deleting user ${userId} and all related data...`);

    // 1. Get all email addresses for this user (to clean up Redis)
    const userEmails = await db
      .select({ email: userAddresses.email })
      .from(userAddresses)
      .where(eq(userAddresses.userId, userId));

    // 2. Clean up Redis data for each email
    for (const { email } of userEmails) {
      const emailKey = email.toLowerCase();
      const keysToDelete = [
        `inbox:${emailKey}`,
        `recovery:${emailKey}`,
        `retention:${emailKey}`,
        `user:${emailKey}`,
        `session:${emailKey}`,
        `mailbox:session:${emailKey}`,
      ];

      for (const key of keysToDelete) {
        try {
          await redis.del(key);
        } catch (e) {
          console.error(`Failed to delete Redis key ${key}:`, e);
        }
      }
      console.log(`[Admin] Cleaned up Redis for ${email}`);
    }

    // 3. Delete from all related tables (order matters for foreign keys)
    // Delete BetterAuth sessions
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
    console.log(`[Admin] Deleted sessions for user ${userId}`);

    // Delete BetterAuth accounts
    await db.delete(account).where(eq(account.userId, userId));
    console.log(`[Admin] Deleted accounts for user ${userId}`);

    // Delete VaultMail custom tables
    await db.delete(userAddresses).where(eq(userAddresses.userId, userId));
    console.log(`[Admin] Deleted user addresses for user ${userId}`);

    await db.delete(userMailboxSessions).where(eq(userMailboxSessions.userId, userId));
    console.log(`[Admin] Deleted mailbox sessions for user ${userId}`);

    await db.delete(userEmailHistory).where(eq(userEmailHistory.userId, userId));
    console.log(`[Admin] Deleted email history for user ${userId}`);

    await db.delete(userDomains).where(eq(userDomains.userId, userId));
    console.log(`[Admin] Deleted user domains for user ${userId}`);

    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    console.log(`[Admin] Deleted user preferences for user ${userId}`);

    // 4. Finally delete the user
    await db.delete(user).where(eq(user.id, userId));
    console.log(`[Admin] Deleted user ${userId}`);

    return NextResponse.json({
      success: true,
      userId,
      deletedEmails: userEmails.length,
    });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

