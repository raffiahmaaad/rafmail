import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { globalDomains } from "@/lib/schema";
import { eq, not } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Helper to verify admin access
 */
async function checkAdminAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;
  
  if (!sessionToken) {
    return false;
  }

  return await verifyAdminSession(sessionToken);
}

/**
 * GET - List all global domains
 */
export async function GET() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const domains = await db.select().from(globalDomains).orderBy(globalDomains.createdAt);
    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Admin domains list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a new global domain
 */
export async function POST(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { domain, isDefault } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    // Validate domain format (allow subdomains like rafxyz.web.id)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // If setting as default, unset all other defaults first
    if (isDefault) {
      await db.update(globalDomains).set({ isDefault: false });
    }

    // Insert domain
    const [newDomain] = await db
      .insert(globalDomains)
      .values({ 
        domain: domain.toLowerCase(),
        isDefault: isDefault || false 
      })
      .returning();

    return NextResponse.json({ domain: newDomain });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Domain already exists" },
        { status: 409 }
      );
    }
    console.error("Admin domain add error:", error);
    return NextResponse.json(
      { error: "Failed to add domain" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update domain (set as default)
 */
export async function PATCH(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { domain, isDefault } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    // If setting as default, unset all others first
    if (isDefault) {
      await db.update(globalDomains).set({ isDefault: false });
    }

    // Update the specified domain
    const [updated] = await db
      .update(globalDomains)
      .set({ isDefault })
      .where(eq(globalDomains.domain, domain.toLowerCase()))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ domain: updated });
  } catch (error) {
    console.error("Admin domain update error:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a global domain
 */
export async function DELETE(req: Request) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 });
    }

    await db.delete(globalDomains).where(eq(globalDomains.domain, domain.toLowerCase()));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin domain delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}
