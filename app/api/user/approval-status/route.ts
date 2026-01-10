import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * GET - Check user approval status
 * Returns the current user's approval status
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select({
        approvalStatus: user.approvalStatus,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const userStatus = result[0];

    if (!userStatus) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      approvalStatus: userStatus.approvalStatus,
      email: userStatus.email,
      isPending: userStatus.approvalStatus === "pending",
      isRejected: userStatus.approvalStatus === "rejected",
      isApproved: userStatus.approvalStatus === "approved",
    });
  } catch (error) {
    console.error("Approval status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
