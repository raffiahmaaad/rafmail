import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const session = searchParams.get('session');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  // Security: Verify session if provided
  if (session) {
    try {
      const sessionKey = `mailbox-session:${session}`;
      const storedEmail = await redis.get(sessionKey);

      if (storedEmail) {
        const normalizedAddress = address.toLowerCase();
        const normalizedStoredEmail = (storedEmail as string).toLowerCase();

        // Session is valid and matches email - allow access
        if (normalizedAddress === normalizedStoredEmail) {
          const key = `inbox:${address.toLowerCase()}`;
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
    const emailTokenKey = `email:${address.toLowerCase()}:token`;
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
    const key = `inbox:${address.toLowerCase()}`;
    const emails = await redis.lrange(key, 0, -1);
    return NextResponse.json({ emails: emails || [] });
  } catch (error) {
    console.error('Inbox Error:', error);
    return NextResponse.json({ emails: [] }, { status: 200 });
  }
}
