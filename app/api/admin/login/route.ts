import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminCredentials, createAdminSession } from "@/lib/admin";

/**
 * POST - Admin login with email, password, and master key
 * Completely separate from user authentication
 */
export async function POST(req: Request) {
  try {
    const { email, password, masterKey } = await req.json();

    // Validate input
    if (!email || !password || !masterKey) {
      return NextResponse.json(
        { error: "Email, password, and master key are required" },
        { status: 400 }
      );
    }

    // Verify all credentials
    const isValid = verifyAdminCredentials(email, password, masterKey);

    if (!isValid) {
      // Log failed attempt
      console.warn(`Failed admin login attempt from email: ${email}`);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 403 }
      );
    }

    // Create admin session
    const sessionToken = await createAdminSession();

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
