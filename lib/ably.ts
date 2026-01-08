import Ably from "ably";

// Server-side Ably client (for publishing)
export const getAblyServer = (): Ably.Rest | null => {
  if (!process.env.ABLY_API_KEY) {
    console.warn("ABLY_API_KEY is not set - realtime notifications disabled");
    return null;
  }
  return new Ably.Rest(process.env.ABLY_API_KEY);
};

// Client-side Ably key (subscribe only)
export const ABLY_PUBLIC_KEY = process.env.NEXT_PUBLIC_ABLY_KEY || "";

// Channel name helper
export const getInboxChannel = (email: string) => {
  // Replace special chars for valid channel name
  return `inbox:${email.replace(/[@.]/g, "_")}`;
};
