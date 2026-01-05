import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address, retentionSeconds } = await req.json();

    if (!address || !retentionSeconds) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Save retention setting for this address
    // Key: settings:{address} -> JSON Value
    await redis.set(`settings:${address.toLowerCase()}`, JSON.stringify({
        retentionSeconds: parseInt(retentionSeconds)
    }));

    // Also persist this setting itself for a few days so it doesn't vanish if unused
    // But typically it should last as long as the address is in use
    await redis.expire(`settings:${address.toLowerCase()}`, 604800); // 7 days

    // If there are existing emails/keys, we might want to update their TTL, but that's expensive.
    // Instead, we focus on *future* emails respecting this. 
    // However, we SHOULD update the 'inbox:{address}' list TTL if it exists.
    const inboxKey = `inbox:${address.toLowerCase()}`;
    const exists = await redis.exists(inboxKey);
    if (exists) {
        await redis.expire(inboxKey, parseInt(retentionSeconds));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
