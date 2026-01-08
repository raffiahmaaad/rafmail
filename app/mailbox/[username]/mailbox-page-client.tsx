"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InboxInterface } from "@/components/inbox-interface";
import { MailboxVerifyModal } from "@/components/mailbox-verify-modal";
import { Shield, User } from "lucide-react";
import Link from "next/link";

interface MailboxPageClientProps {
  username: string;
}

export function MailboxPageClient({ username }: MailboxPageClientProps) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fullEmail, setFullEmail] = useState<string>("");

  // Determine the full email address
  useEffect(() => {
    const savedAddr = localStorage.getItem("dispo_address");
    let domainToUse = "rafxyz.web.id";
    if (savedAddr && savedAddr.includes("@")) {
      domainToUse = savedAddr.split("@")[1];
    }
    const email = `${username}@${domainToUse}`;
    setFullEmail(email);
  }, [username]);

  // Check for existing valid session
  useEffect(() => {
    if (!fullEmail) return;

    const checkSession = async () => {
      setIsChecking(true);

      try {
        // Check localStorage first
        const sessions = JSON.parse(
          localStorage.getItem("mailbox_sessions") || "{}"
        );
        const emailSession = sessions[fullEmail.toLowerCase()];

        if (emailSession && emailSession.token && emailSession.expiresAt) {
          // Check if not expired locally
          if (Date.now() < emailSession.expiresAt) {
            // Verify with server
            const res = await fetch(
              `/api/verify-access?email=${encodeURIComponent(fullEmail)}&session=${encodeURIComponent(emailSession.token)}`
            );
            const data = await res.json();

            if (data.verified) {
              setSessionToken(emailSession.token);
              setIsVerified(true);
              setIsChecking(false);
              return;
            }
          }

          // Session invalid or expired, remove it
          delete sessions[fullEmail.toLowerCase()];
          localStorage.setItem("mailbox_sessions", JSON.stringify(sessions));
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }

      setIsChecking(false);
    };

    checkSession();
  }, [fullEmail]);

  const handleVerified = (token: string) => {
    setSessionToken(token);
    setIsVerified(true);
  };

  const handleCancel = () => {
    router.push("/");
  };

  // Loading state
  if (isChecking || !fullEmail) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Checking access...</p>
          </div>
        </div>
      </main>
    );
  }

  // Show verification modal if not verified
  if (!isVerified) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <MailboxVerifyModal
          email={fullEmail}
          onVerified={handleVerified}
          onCancel={handleCancel}
        />
      </main>
    );
  }

  // Verified - show inbox
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <span>RafMail</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 pt-4 pb-8">
        <InboxInterface
          initialUsername={username}
          sessionToken={sessionToken}
        />
      </div>

      <footer className="border-t border-white/5 py-6 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} RafMail. Open Source.</p>
      </footer>
    </main>
  );
}
