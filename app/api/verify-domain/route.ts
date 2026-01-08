import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

// Cloudflare Email Routing MX servers
const CLOUDFLARE_MX_SERVERS = [
  "route1.mx.cloudflare.net",
  "route2.mx.cloudflare.net",
  "route3.mx.cloudflare.net",
];

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { verified: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    // Clean and validate domain format
    const cleanDomain = domain.trim().toLowerCase();
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { verified: false, error: "Invalid domain format" },
        { status: 400 }
      );
    }

    try {
      // Lookup MX records for the domain
      const mxRecords = await resolveMx(cleanDomain);

      if (!mxRecords || mxRecords.length === 0) {
        return NextResponse.json({
          verified: false,
          mxRecords: [],
          error: "No MX records found. Please configure DNS records first.",
        });
      }

      // Extract exchange hostnames
      const foundMxServers = mxRecords.map((record) =>
        record.exchange.toLowerCase().replace(/\.$/, "")
      );

      // Check if any Cloudflare MX servers are present
      const hasCloudflare = foundMxServers.some((server) =>
        CLOUDFLARE_MX_SERVERS.some(
          (cf) => server === cf || server.endsWith("." + cf)
        )
      );

      // Format MX records for display
      const formattedRecords = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map((r) => `${r.exchange} (priority: ${r.priority})`);

      return NextResponse.json({
        verified: hasCloudflare,
        mxRecords: formattedRecords,
        message: hasCloudflare
          ? "Domain is properly configured with Cloudflare Email Routing"
          : "MX records found but not configured for Cloudflare Email Routing",
      });
    } catch (dnsError: unknown) {
      const error = dnsError as { code?: string };
      if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
        return NextResponse.json({
          verified: false,
          mxRecords: [],
          error: "Domain not found or no MX records configured",
        });
      }
      throw dnsError;
    }
  } catch (error) {
    console.error("Domain verification error:", error);
    return NextResponse.json(
      { verified: false, error: "Failed to verify domain" },
      { status: 500 }
    );
  }
}
