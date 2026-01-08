import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_DOMAINS = ["rafxyz.web.id"];

// GET: Fetch user's custom domains
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const key = `user:${userEmail}:domains`;

    // Get custom domains from Redis Set
    const customDomains = await redis.smembers(key);

    // Combine with default domains
    const allDomains = [...DEFAULT_DOMAINS, ...customDomains];

    return NextResponse.json({
      domains: allDomains,
      customDomains: customDomains,
    });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Add a new custom domain
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Invalid domain" },
        { status: 400 }
      );
    }

    const cleanDomain = domain.trim().toLowerCase();

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Don't allow adding default domains
    if (DEFAULT_DOMAINS.includes(cleanDomain)) {
      return NextResponse.json(
        { error: "Cannot add default domain" },
        { status: 400 }
      );
    }

    const userEmail = session.user.email;
    const key = `user:${userEmail}:domains`;

    // Add domain to user's set
    await redis.sadd(key, cleanDomain);

    return NextResponse.json({ success: true, domain: cleanDomain });
  } catch (error) {
    console.error("Error adding domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a custom domain
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Invalid domain" },
        { status: 400 }
      );
    }

    const cleanDomain = domain.trim().toLowerCase();

    // Don't allow deleting default domains
    if (DEFAULT_DOMAINS.includes(cleanDomain)) {
      return NextResponse.json(
        { error: "Cannot delete default domain" },
        { status: 400 }
      );
    }

    const userEmail = session.user.email;
    const key = `user:${userEmail}:domains`;

    // Remove domain from user's set
    await redis.srem(key, cleanDomain);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
