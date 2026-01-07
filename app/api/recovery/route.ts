import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";

// Generate a recovery token for an email address
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Generate unique token
    const tokenId = crypto.randomBytes(32).toString("base64url");
    const token = `${tokenId}.${Buffer.from(email).toString("base64url")}`;
    
    // Store in Redis with 30 day TTL
    const tokenKey = `recovery:${tokenId}`;
    await redis.set(tokenKey, email);
    await redis.expire(tokenKey, 30 * 24 * 60 * 60); // 30 days

    return NextResponse.json({ 
      token,
      expiresIn: "30 days"
    });
  } catch (error) {
    console.error("Recovery token error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}

// Validate recovery token and return email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Parse token
    const [tokenId] = token.split(".");
    if (!tokenId) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    // Lookup in Redis
    const tokenKey = `recovery:${tokenId}`;
    const email = await redis.get(tokenKey);

    if (!email) {
      return NextResponse.json({ error: "Token expired or invalid" }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error("Recovery validation error:", error);
    return NextResponse.json({ error: "Failed to validate token" }, { status: 500 });
  }
}
