import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address, retentionSeconds, isLoggedIn } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    // RETENTION POLICY:
    // - Logged-in users: can choose any retention (default: permanent = -1)
    // - Guests: always 24 hours (86400), cannot be overridden
    let finalRetention: number;
    
    if (isLoggedIn) {
      // Logged-in users can choose their own retention
      // If not specified, default to permanent (-1)
      finalRetention = retentionSeconds !== undefined ? parseInt(retentionSeconds) : -1;
    } else {
      // Guests are always locked to 24 hours
      finalRetention = 86400;
    }

    const settingsKey = `settings:${address.toLowerCase()}`;

    // Save retention setting for this address
    await redis.set(settingsKey, JSON.stringify({
      retentionSeconds: finalRetention,
      isLoggedIn: !!isLoggedIn
    }));

    // Settings TTL:
    // - Logged in: permanent (no TTL) 
    // - Guest: 24 hours (same as email expiry)
    if (!isLoggedIn) {
      await redis.expire(settingsKey, 86400); // 24 hours for guests
    }
    // For logged-in users, no expire on settings

    // Update the 'inbox:{address}' list TTL if it exists.
    const inboxKey = `inbox:${address.toLowerCase()}`;
    const exists = await redis.exists(inboxKey);
    if (exists) {
      if (finalRetention === -1) {
        // Forever: remove TTL using persist
        await redis.persist(inboxKey);
      } else {
        await redis.expire(inboxKey, finalRetention);
      }
    }

    return NextResponse.json({ success: true, retention: finalRetention });
  } catch (error) {
    console.error('Settings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
