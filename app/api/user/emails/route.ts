import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";

// Get all emails for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmailsKey = `user:${session.user.email}:emails`;
    const emails = await redis.smembers(userEmailsKey);

    // Get recovery tokens for each email
    const emailsWithTokens = await Promise.all(
      emails.map(async (email) => {
        const tokenKey = `email:${email}:token`;
        const token = await redis.get(tokenKey);
        return { email, recoveryToken: token || null };
      })
    );

    return NextResponse.json({ emails: emailsWithTokens });
  } catch (error) {
    console.error("Get user emails error:", error);
    return NextResponse.json({ error: "Failed to get emails" }, { status: 500 });
  }
}

// Associate email with user account
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, recoveryToken } = await request.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const userEmailsKey = `user:${session.user.email}:emails`;
    
    // Add email to user's set
    await redis.sadd(userEmailsKey, email);
    
    // Store recovery token reference
    if (recoveryToken) {
      const tokenKey = `email:${email}:token`;
      await redis.set(tokenKey, recoveryToken);
      await redis.expire(tokenKey, 30 * 24 * 60 * 60);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Associate email error:", error);
    return NextResponse.json({ error: "Failed to associate email" }, { status: 500 });
  }
}
