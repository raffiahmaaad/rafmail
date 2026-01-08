import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userDomains } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_DOMAINS = ["rafxyz.web.id"];

/**
 * GET: Fetch user's custom domains from PostgreSQL
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domains = await db
      .select({
        domain: userDomains.domain,
        verified: userDomains.verified,
      })
      .from(userDomains)
      .where(eq(userDomains.userId, session.user.id));

    const customDomains = domains.map((d) => d.domain);
    const allDomains = [...DEFAULT_DOMAINS, ...customDomains];

    return NextResponse.json({
      domains: allDomains,
      customDomains: domains,
    });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Add a new custom domain
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain, verified } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase();

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
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

    // Upsert domain
    await db
      .insert(userDomains)
      .values({
        userId: session.user.id,
        domain: cleanDomain,
        verified: verified ?? false,
      })
      .onConflictDoUpdate({
        target: [userDomains.userId, userDomains.domain],
        set: {
          verified: verified ?? false,
        },
      });

    return NextResponse.json({ success: true, domain: cleanDomain });
  } catch (error) {
    console.error("Error adding domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a custom domain
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase();

    // Don't allow deleting default domains
    if (DEFAULT_DOMAINS.includes(cleanDomain)) {
      return NextResponse.json(
        { error: "Cannot delete default domain" },
        { status: 400 }
      );
    }

    await db
      .delete(userDomains)
      .where(
        eq(userDomains.userId, session.user.id) &&
          eq(userDomains.domain, cleanDomain)
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
