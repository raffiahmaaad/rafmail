"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { InboxInterface } from "@/components/inbox-interface";
import { MailboxVerifyModal } from "@/components/mailbox-verify-modal";
import { Shield, User, Key } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

interface MailboxPageClientProps {
  username: string;
}

export function MailboxPageClient({ username }: MailboxPageClientProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fullEmail, setFullEmail] = useState<string>("");
  const hasChecked = useRef(false);

  // Resolve email AND check access in one operation
  useEffect(() => {
    // Wait for session loading to complete
    if (isPending) return;

    // Prevent duplicate runs
    if (hasChecked.current) return;
    hasChecked.current = true;

    const resolveAndCheckAccess = async () => {
      setIsChecking(true);

      // LOGGED IN: Find the email in user's saved emails with matching username
      if (session?.user?.id) {
        try {
          const res = await fetch("/api/user/emails");
          const data = await res.json();
          const emails = data.emails || [];

          // Find any email that starts with this username
          const matchingEmail = emails.find((e: { email: string }) =>
            e.email.toLowerCase().startsWith(username.toLowerCase() + "@")
          );

          if (matchingEmail) {
            // Found email in user's account - grant access immediately!
            setFullEmail(matchingEmail.email);
            setIsVerified(true);
            setIsChecking(false);
            return;
          }
        } catch (e) {
          console.error("Failed to fetch user emails:", e);
        }
      }

      // GUEST or email not found in user's account: Use localStorage
      const savedAddr = localStorage.getItem("dispo_address");
      let domainToUse = "rafxyz.web.id";
      if (savedAddr && savedAddr.includes("@")) {
        domainToUse = savedAddr.split("@")[1];
      }
      const resolvedEmail = `${username}@${domainToUse}`;
      setFullEmail(resolvedEmail);

      // For guests: Check localStorage for session
      const sessions = JSON.parse(
        localStorage.getItem("mailbox_sessions") || "{}"
      );
      const emailSession = sessions[resolvedEmail.toLowerCase()];

      if (emailSession && emailSession.token && emailSession.expiresAt) {
        if (Date.now() < emailSession.expiresAt) {
          // Verify with server
          try {
            const verifyRes = await fetch(
              `/api/verify-access?email=${encodeURIComponent(resolvedEmail)}&session=${encodeURIComponent(emailSession.token)}`
            );
            const verifyData = await verifyRes.json();

            if (verifyData.verified) {
              setSessionToken(emailSession.token);
              setIsVerified(true);
              setIsChecking(false);
              return;
            }
          } catch (e) {
            console.error("Session verification failed:", e);
          }
        }

        // Session invalid or expired, remove it
        delete sessions[resolvedEmail.toLowerCase()];
        localStorage.setItem("mailbox_sessions", JSON.stringify(sessions));
      }

      setIsChecking(false);
    };

    resolveAndCheckAccess();
  }, [username, isPending, session?.user?.id]);

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

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/5"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/recover"
                  className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/5"
                >
                  <Key className="h-4 w-4" />
                  <span className="hidden sm:inline">Recover</span>
                </Link>
                <Link
                  href="/auth/signin"
                  className="text-sm bg-white text-black hover:bg-white/90 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium"
                >
                  Sign In
                </Link>
              </>
            )}
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
        <p>© {new Date().getFullYear()} RafMail. By Leraie.</p>
      </footer>
    </main>
  );
}
