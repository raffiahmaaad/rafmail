import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address, retentionSeconds } = await req.json();

    if (!address || retentionSeconds === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const retention = parseInt(retentionSeconds);

    // Save retention setting for this address
    // Key: settings:{address} -> JSON Value
    await redis.set(`settings:${address.toLowerCase()}`, JSON.stringify({
        retentionSeconds: retention
    }));

    // Also persist this setting itself for a few days so it doesn't vanish if unused
    // But typically it should last as long as the address is in use
    await redis.expire(`settings:${address.toLowerCase()}`, 604800); // 7 days

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
