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
 * POST - Make an email address permanent (remove TTL from all related Redis keys)
 */
export async function POST(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const persistedKeys: string[] = [];
    const errors: string[] = [];

    // List of key patterns to persist
    const keyPatterns = [
      `inbox:${normalizedAddress}`,
      `settings:${normalizedAddress}`,
      `email-session:${normalizedAddress}`,
    ];

    // Persist direct keys
    for (const key of keyPatterns) {
      try {
        const exists = await redis.exists(key);
        if (exists) {
          await redis.persist(key);
          persistedKeys.push(key);
        }
      } catch (error) {
        errors.push(`Failed to persist ${key}`);
      }
    }

    // Find and persist recovery token
    try {
      const emailTokenKey = `email:${normalizedAddress}:token`;
      const token = await redis.get(emailTokenKey);
      if (token) {
        await redis.persist(emailTokenKey);
        persistedKeys.push(emailTokenKey);
        
        // Parse token to get tokenId and persist recovery key
        const tokenStr = token as string;
        const [tokenId] = tokenStr.split(".");
        if (tokenId) {
          const recoveryKey = `recovery:${tokenId}`;
          const recoveryExists = await redis.exists(recoveryKey);
          if (recoveryExists) {
            await redis.persist(recoveryKey);
            persistedKeys.push(recoveryKey);
          }
        }
      }
    } catch (error) {
      errors.push("Failed to persist recovery token");
    }

    // Find and persist mailbox sessions using scan
    try {
      let cursor: number | string = 0;
      const sessionKeys: string[] = [];
      
      do {
        const result = await redis.scan(cursor, { 
          match: "mailbox-session:*", 
          count: 100 
        }) as [number | string, string[]];
        cursor = result[0];
        
        // Check each session to see if it belongs to this email
        for (const key of result[1]) {
          const sessionEmail = await redis.get(key);
          if (sessionEmail && (sessionEmail as string).toLowerCase() === normalizedAddress) {
            await redis.persist(key);
            sessionKeys.push(key);
            persistedKeys.push(key);
          }
        }
      } while (cursor !== 0 && cursor !== "0");
    } catch (error) {
      errors.push("Failed to persist mailbox sessions");
    }

    return NextResponse.json({ 
      success: true,
      persistedKeys,
      errors: errors.length > 0 ? errors : undefined,
      message: `Made ${persistedKeys.length} keys permanent for ${address}`
    });
  } catch (error) {
    console.error("Admin persist error:", error);
    return NextResponse.json(
      { error: "Failed to make permanent" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Make ALL user emails permanent (batch operation)
 */
export async function PATCH(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const persistedEmails: string[] = [];
    const errors: string[] = [];

    // Find all inbox keys (these represent all emails)
    let cursor: number | string = 0;
    const inboxKeys: string[] = [];
    
    do {
      const result = await redis.scan(cursor, { 
        match: "inbox:*", 
        count: 100 
      }) as [number | string, string[]];
      cursor = result[0];
      inboxKeys.push(...result[1]);
    } while (cursor !== 0 && cursor !== "0");

    // For each inbox, check if it's a user email and persist
    for (const inboxKey of inboxKeys) {
      const email = inboxKey.replace("inbox:", "");
      
      // Check settings to see if it's a logged-in user
      const settingsKey = `settings:${email}`;
      const settingsRaw = await redis.get(settingsKey);
      
      let isLoggedIn = false;
      if (settingsRaw) {
        try {
          const settings = typeof settingsRaw === 'string' 
            ? JSON.parse(settingsRaw) 
            : settingsRaw;
          isLoggedIn = settings.isLoggedIn === true;
        } catch (e) {
          // Not a valid settings object
        }
      }

      if (isLoggedIn) {
        // Persist all keys for this email
        try {
          await redis.persist(inboxKey);
          await redis.persist(settingsKey);
          
          const emailSessionKey = `email-session:${email}`;
          if (await redis.exists(emailSessionKey)) {
            await redis.persist(emailSessionKey);
          }

          // Find and persist recovery token
          const emailTokenKey = `email:${email}:token`;
          const token = await redis.get(emailTokenKey);
          if (token) {
            await redis.persist(emailTokenKey);
            const tokenStr = token as string;
            const [tokenId] = tokenStr.split(".");
            if (tokenId) {
              const recoveryKey = `recovery:${tokenId}`;
              if (await redis.exists(recoveryKey)) {
                await redis.persist(recoveryKey);
              }
            }
          }
          
          persistedEmails.push(email);
        } catch (error) {
          errors.push(`Failed to persist ${email}`);
        }
      }
    }

    // Also persist ALL mailbox-session keys that belong to user emails
    let sessionCursor: number | string = 0;
    const persistedSessionEmails = new Set(persistedEmails.map(e => e.toLowerCase()));
    
    do {
      const result = await redis.scan(sessionCursor, { 
        match: "mailbox-session:*", 
        count: 100 
      }) as [number | string, string[]];
      sessionCursor = result[0];
      
      for (const key of result[1]) {
        try {
          const sessionEmail = await redis.get(key);
          if (sessionEmail && persistedSessionEmails.has((sessionEmail as string).toLowerCase())) {
            await redis.persist(key);
          }
        } catch (e) {
          // Ignore individual session errors
        }
      }
    } while (sessionCursor !== 0 && sessionCursor !== "0");

    return NextResponse.json({ 
      success: true,
      persistedCount: persistedEmails.length,
      persistedEmails,
      errors: errors.length > 0 ? errors : undefined,
      message: `Made ${persistedEmails.length} user emails permanent`
    });
  } catch (error) {
    console.error("Admin batch persist error:", error);
    return NextResponse.json(
      { error: "Failed to batch persist" },
      { status: 500 }
    );
  }
}
