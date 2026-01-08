import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { userAddresses } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const session = searchParams.get('session');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  // Check if user is logged in and owns this email
  try {
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (authSession?.user?.id) {
      // Check if this email belongs to the logged-in user
      const userEmails = await db
        .select()
        .from(userAddresses)
        .where(eq(userAddresses.userId, authSession.user.id));

      const ownsEmail = userEmails.some(
        (e) => e.email.toLowerCase() === normalizedAddress
      );

      if (ownsEmail) {
        // User owns this email - grant access!
        const key = `inbox:${normalizedAddress}`;
        const emails = await redis.lrange(key, 0, -1);
        return NextResponse.json({ emails: emails || [] });
      }
    }
  } catch (authError) {
    // Auth check failed, continue with session-based check
    console.error('Auth check error:', authError);
  }

  // Security: Verify session if provided
  if (session) {
    try {
      const sessionKey = `mailbox-session:${session}`;
      const storedEmail = await redis.get(sessionKey);

      if (storedEmail) {
        const normalizedStoredEmail = (storedEmail as string).toLowerCase();

        // Session is valid and matches email - allow access
        if (normalizedAddress === normalizedStoredEmail) {
          const key = `inbox:${normalizedAddress}`;
          const emails = await redis.lrange(key, 0, -1);
          return NextResponse.json({ emails: emails || [] });
        }
      }

      // Session invalid or doesn't match email
      return NextResponse.json({ 
        requiresVerification: true, 
        reason: 'session_invalid' 
      });
    } catch (error) {
      console.error('Session verification error:', error);
      return NextResponse.json({ 
        requiresVerification: true, 
        reason: 'verification_error' 
      });
    }
  }

  // No session provided - check if this email has a recovery token (is protected)
  try {
    const emailTokenKey = `email:${normalizedAddress}:token`;
    const hasRecoveryToken = await redis.exists(emailTokenKey);

    if (hasRecoveryToken) {
      // Email is protected, require verification
      return NextResponse.json({ 
        requiresVerification: true, 
        reason: 'protected_mailbox' 
      });
    }

    // Email not protected (no recovery token), allow access
    // This is for backwards compatibility with emails created before security update
    const key = `inbox:${normalizedAddress}`;
    const emails = await redis.lrange(key, 0, -1);
    return NextResponse.json({ emails: emails || [] });
  } catch (error) {
    console.error('Inbox Error:', error);
    return NextResponse.json({ emails: [] }, { status: 200 });
  }
}

