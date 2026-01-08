import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address, retentionSeconds, isLoggedIn } = await req.json();

    if (!address || retentionSeconds === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const retention = parseInt(retentionSeconds);
    const settingsKey = `settings:${address.toLowerCase()}`;

    // Save retention setting for this address
    await redis.set(settingsKey, JSON.stringify({
      retentionSeconds: retention,
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
      if (retention === -1) {
        // Forever: remove TTL using persist
        await redis.persist(inboxKey);
      } else {
        await redis.expire(inboxKey, retention);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

