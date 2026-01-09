"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { InboxInterface } from "@/components/inbox-interface";
import { MailboxVerifyModal } from "@/components/mailbox-verify-modal";
import { Shield, Zap, Globe, Key } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface AddressPageClientProps {
  address: string;
}

export function AddressPageClient({ address }: AddressPageClientProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const hasChecked = useRef(false);

  // Check for existing valid session or user ownership
  useEffect(() => {
    // Wait for session loading to complete
    if (isPending) return;

    // Prevent duplicate runs
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkSession = async () => {
      setIsChecking(true);

      try {
        // If user is logged in, check if this email belongs to them
        if (session?.user?.id) {
          const userEmailsRes = await fetch("/api/user/emails");
          const userEmailsData = await userEmailsRes.json();
          const userEmails = userEmailsData.emails || [];

          // Check if this address belongs to the logged-in user
          const ownsEmail = userEmails.some(
            (e: { email: string }) =>
              e.email.toLowerCase() === address.toLowerCase()
          );

          if (ownsEmail) {
            // User owns this email, auto-verify without needing recovery key
            setIsVerified(true);
            setIsChecking(false);
            return;
          }
        }

        // Check localStorage for existing session
        const sessions = JSON.parse(
          localStorage.getItem("mailbox_sessions") || "{}"
        );
        const emailSession = sessions[address.toLowerCase()];

        if (emailSession && emailSession.token && emailSession.expiresAt) {
          // Check if not expired locally
          if (Date.now() < emailSession.expiresAt) {
            // Verify with server
            const res = await fetch(
              `/api/verify-access?email=${encodeURIComponent(address)}&session=${encodeURIComponent(emailSession.token)}`
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
          delete sessions[address.toLowerCase()];
          localStorage.setItem("mailbox_sessions", JSON.stringify(sessions));
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }

      setIsChecking(false);
    };

    checkSession();
  }, [address, isPending, session?.user?.id]);

  const handleVerified = (token: string) => {
    setSessionToken(token);
    setIsVerified(true);
  };

  const handleCancel = () => {
    router.push("/");
  };

  // Loading state
  if (isChecking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <MailboxVerifyModal
          email={address}
          onVerified={handleVerified}
          onCancel={handleCancel}
        />
      </main>
    );
  }

  // Verified - show inbox
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <span>RafMail</span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <a
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/5"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </a>
            ) : (
              <>
                <a
                  href="/recover"
                  className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/5"
                >
                  <Key className="h-4 w-4" />
                  <span className="hidden sm:inline">Recover</span>
                </a>
                <a
                  href="/auth/signin"
                  className="text-sm bg-white text-black hover:bg-white/90 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium"
                >
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 py-12">
        <div className="text-center max-w-2xl mx-auto px-4 mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
            Disposable Email <br /> for Everyone.
          </h1>
          <p className="text-muted-foreground text-lg">
            Secure, serverless temporary email service deployed on Vercel. Bring
            your own domain or use the default.
          </p>
        </div>

        <InboxInterface initialAddress={address} sessionToken={sessionToken} />
      </div>

      <footer className="border-t border-white/5 py-8 mt-12 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} VaultMail. By Leraie.</p>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="mb-4 p-3 rounded-full bg-white/5 w-fit">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
