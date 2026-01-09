import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';
import { extractEmail } from '@/lib/utils';
import crypto from 'crypto';
import { getAblyServer, getInboxChannel } from '@/lib/ably';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let from, to, subject, text, html;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      ({ from, to, subject, text, html } = body);
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = formData.get('from') as string;
      to = formData.get('to') as string || formData.get('recipient') as string;
      subject = formData.get('subject') as string;
      text = formData.get('text') as string || formData.get('body-plain') as string;
      html = formData.get('html') as string || formData.get('body-html') as string;
    } else {
       return new NextResponse('Unsupported Content-Type', { status: 415 });
    }

    if (!to || !from) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    const cleanTo = extractEmail(to);
    
    if (!cleanTo) {
      return new NextResponse('Invalid recipient', { status: 400 });
    }

    const emailId = crypto.randomUUID();
    const emailData = {
      id: emailId,
      from,
      to,
      subject: subject || '(No Subject)',
      text: text || '',
      html: html || text || '', // Fallback
      receivedAt: new Date().toISOString(),
      read: false
    };

    const normalizedEmail = cleanTo.toLowerCase();
    const key = `inbox:${normalizedEmail}`;
    
    // Check for custom retention settings
    const settingsKey = `settings:${normalizedEmail}`;
    const settingsRaw = await redis.get(settingsKey);
    
    // RETENTION POLICY:
    // - Logged-in users: use their saved retention preference (default: permanent = -1)
    // - Guests: always 1h (3600 seconds)
    let retention = 3600; // Default 1h (guest mode)
    let isLoggedIn = false;

    if (settingsRaw) {
      try {
        // If stored as JSON string
        if (typeof settingsRaw === 'string') {
          const s = JSON.parse(settingsRaw);
          if (s.isLoggedIn !== undefined) isLoggedIn = s.isLoggedIn;
          if (isLoggedIn) {
            // Logged-in users: use their chosen retention (or default -1 if not set)
            retention = s.retentionSeconds !== undefined ? s.retentionSeconds : -1;
          } else {
            // Guests: always 1h, cannot override
            retention = 3600;
          }
        } else if (typeof settingsRaw === 'object') {
          // Upstash REST client might return object directly if auto-deserializing
          const s = settingsRaw as any;
          if (s.isLoggedIn !== undefined) isLoggedIn = s.isLoggedIn;
          if (isLoggedIn) {
            retention = s.retentionSeconds !== undefined ? s.retentionSeconds : -1;
          } else {
            retention = 3600;
          }
        }
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    
    // Store email in a list (LIFO usually better for email? No, Redis list is generic. lpush = prepend)
    // lpush puts new emails at index 0.
    await redis.lpush(key, emailData);
    
    // Set expiry based on retention setting
    // - Logged-in: permanent (retention = -1), no TTL
    // - Guest: 1 hour (retention = 3600)
    if (retention !== -1) {
      await redis.expire(key, retention);
    }
    // If retention is -1 (permanent for logged-in), no TTL is set

    // Publish realtime notification via Ably
    try {
      const ably = getAblyServer();
      if (ably) {
        const channel = ably.channels.get(getInboxChannel(normalizedEmail));
        await channel.publish('new-email', {
          id: emailId,
          from,
          subject: subject || '(No Subject)',
          receivedAt: emailData.receivedAt
        });
      }
    } catch (ablyError) {
      // Don't fail the request if Ably fails, just log it
      console.error('Ably publish error:', ablyError);
    }

    return NextResponse.json({ success: true, id: emailId });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
