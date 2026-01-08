import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";

// Get all emails for authenticated user (sorted by newest first)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmailsKey = `user:${session.user.email}:emails`;
    
    let emails: string[] = [];
    
    try {
      // Try to get emails as sorted set (new format)
      emails = await redis.zrange(userEmailsKey, 0, -1, { rev: true });
    } catch (error: any) {
      // If WRONGTYPE error, migrate from Set to Sorted Set
      if (error?.message?.includes("WRONGTYPE")) {
        console.log("Migrating user emails from Set to Sorted Set...");
        
        // Get emails from old Set format
        const oldEmails = await redis.smembers(userEmailsKey);
        
        if (oldEmails.length > 0) {
          // Delete old Set
          await redis.del(userEmailsKey);
          
          // Re-add as Sorted Set with timestamps (oldest first based on array order)
          const now = Date.now();
          for (let i = 0; i < oldEmails.length; i++) {
            // Give each email a slightly different timestamp so order is preserved
            await redis.zadd(userEmailsKey, { score: now - (oldEmails.length - i) * 1000, member: oldEmails[i] });
          }
          
          // Now get emails in sorted order
          emails = await redis.zrange(userEmailsKey, 0, -1, { rev: true });
        }
      } else {
        throw error;
      }
    }

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
    
    // Add email to user's sorted set with current timestamp as score
    await redis.zadd(userEmailsKey, { score: Date.now(), member: email });
    
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

// Delete email from user account
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const userEmailsKey = `user:${session.user.email}:emails`;
    
    // Remove email from user's sorted set
    await redis.zrem(userEmailsKey, email);
    
    // Optionally remove associated token
    const tokenKey = `email:${email}:token`;
    await redis.del(tokenKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete email error:", error);
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
