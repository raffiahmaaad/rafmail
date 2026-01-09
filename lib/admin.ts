import { db } from "./db";
import { adminSessions } from "./schema";
import { eq, and, gt, lt } from "drizzle-orm";
import crypto from "crypto";

/**
 * Verify admin credentials from environment variables
 * Admin login is completely separate from user system
 */
export function verifyAdminCredentials(email: string, password: string, masterKey: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminMasterKey = process.env.ADMIN_MASTER_KEY;

  if (!adminEmail || !adminPassword || !adminMasterKey) {
    console.error("Admin credentials not configured in environment");
    return false;
  }

  // Check email
  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    return false;
  }

  // Check password (constant-time comparison)
  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(password),
    Buffer.from(adminPassword)
  );
  if (!passwordMatch) {
    return false;
  }

  // Check master key (constant-time comparison)
  const masterKeyMatch = crypto.timingSafeEqual(
    Buffer.from(masterKey),
    Buffer.from(adminMasterKey)
  );
  if (!masterKeyMatch) {
    return false;
  }

  return true;
}

/**
 * Create admin session after successful login
 */
export async function createAdminSession(): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.insert(adminSessions).values({
    userId: "admin", // Fixed admin user
    sessionToken,
    expiresAt,
  });
  
  return sessionToken;
}

/**
 * Verify admin session token
 */
export async function verifyAdminSession(sessionToken: string): Promise<boolean> {
  try {
    const session = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.sessionToken, sessionToken),
          gt(adminSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    
    return session.length > 0;
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return false;
  }
}

/**
 * Delete admin session (logout)
 */
export async function deleteAdminSession(sessionToken: string): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.sessionToken, sessionToken));
}

/**
 * Delete all expired admin sessions (cleanup)
 */
export async function cleanupExpiredAdminSessions(): Promise<void> {
  await db.delete(adminSessions).where(
    lt(adminSessions.expiresAt, new Date())
  );
}
