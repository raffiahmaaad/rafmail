import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Get recovery token by email address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Lookup token by email
    const tokenKey = `email:${email}:token`;
    const token = await redis.get(tokenKey);

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Recovery lookup error:", error);
    return NextResponse.json({ error: "Failed to lookup token" }, { status: 500 });
  }
}
