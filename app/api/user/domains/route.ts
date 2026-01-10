import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userDomains, globalDomains } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_DOMAINS = ["rafxyz.web.id"];

/**
 * GET: Fetch user's custom domains + global domains from PostgreSQL
 * - domains: All available domains for email generation (global + custom)
 * - customDomains: Only user's own added domains (NOT global)
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Fetch global domains (available to all users, even guests)
    const globalDomainsList = await db
      .select({ 
        domain: globalDomains.domain,
        isDefault: globalDomains.isDefault 
      })
      .from(globalDomains)
      .where(eq(globalDomains.active, true));

    const globalDomainNames = globalDomainsList.map((d) => d.domain);
    
    // Find the default domain
    const defaultDomainObj = globalDomainsList.find((d) => d.isDefault);
    const defaultDomain = defaultDomainObj?.domain || DEFAULT_DOMAINS[0];

    // If not logged in, return default + global domains only
    if (!session?.user?.id) {
      const allDomains = [...DEFAULT_DOMAINS, ...globalDomainNames];
      return NextResponse.json({
        domains: [...new Set(allDomains)], // deduplicate
        customDomains: [], // No custom domains for guests
        defaultDomain,
      });
    }

    // Logged in: get user's custom domains (separate from global)
    const userCustomDomains = await db
      .select({
        domain: userDomains.domain,
        verified: userDomains.verified,
      })
      .from(userDomains)
      .where(eq(userDomains.userId, session.user.id));

    // For email generation: combine global + custom domains
    const customDomainNames = userCustomDomains.map((d) => d.domain);
    const allDomains = [...DEFAULT_DOMAINS, ...globalDomainNames, ...customDomainNames];

    return NextResponse.json({
      domains: [...new Set(allDomains)], // All available for email generation
      customDomains: userCustomDomains, // Only user's custom domains for management UI
      defaultDomain,
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
 * - Cannot add global/default domains
 * - Cannot add domain already used by another user
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

    // Check if domain exists in global domains
    const existingGlobal = await db
      .select({ domain: globalDomains.domain })
      .from(globalDomains)
      .where(eq(globalDomains.domain, cleanDomain))
      .limit(1);

    if (existingGlobal.length > 0) {
      return NextResponse.json(
        { error: "This is a public domain managed by admin. You can use it but cannot add it." },
        { status: 400 }
      );
    }

    // Check if domain is already taken by ANY user
    const existingUserDomain = await db
      .select({ userId: userDomains.userId })
      .from(userDomains)
      .where(eq(userDomains.domain, cleanDomain))
      .limit(1);

    if (existingUserDomain.length > 0) {
      // If it's the same user, just update
      if (existingUserDomain[0].userId === session.user.id) {
        // Update existing domain
        await db
          .update(userDomains)
          .set({ verified: verified ?? false })
          .where(
            and(
              eq(userDomains.userId, session.user.id),
              eq(userDomains.domain, cleanDomain)
            )
          );
        return NextResponse.json({ success: true, domain: cleanDomain, updated: true });
      }
      
      // Domain taken by another user
      return NextResponse.json(
        { error: "This domain is already registered by another user" },
        { status: 400 }
      );
    }

    // Insert new domain
    await db.insert(userDomains).values({
      userId: session.user.id,
      domain: cleanDomain,
      verified: verified ?? false,
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
        and(
          eq(userDomains.userId, session.user.id),
          eq(userDomains.domain, cleanDomain)
        )
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

