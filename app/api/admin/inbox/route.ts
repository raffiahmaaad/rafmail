import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin";
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
 * GET - View inbox for a specific email address
 */
export async function GET(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const key = `inbox:${normalizedAddress}`;
    
    // Get all emails from inbox
    const emails = await redis.lrange(key, 0, -1);

    return NextResponse.json({ emails: emails || [] });
  } catch (error) {
    console.error("Admin inbox view error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox" },
      { status: 500 }
    );
  }
}
