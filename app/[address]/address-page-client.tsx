"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InboxInterface } from "@/components/inbox-interface";
import { MailboxVerifyModal } from "@/components/mailbox-verify-modal";
import { Shield, Zap, Globe } from "lucide-react";

interface AddressPageClientProps {
  address: string;
}

export function AddressPageClient({ address }: AddressPageClientProps) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check for existing valid session
  useEffect(() => {
    const checkSession = async () => {
      setIsChecking(true);

      try {
        // Check localStorage first
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
  }, [address]);

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
            <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
              <Shield className="h-6 w-6 text-white" />
            </div>
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span>RafMail</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 py-12">
        <div className="text-center max-w-2xl mx-auto px-4 mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
            Disposable Email <br /> for Developers
          </h1>
          <p className="text-muted-foreground text-lg">
            Secure, serverless temporary email service deployed on Vercel. Bring
            your own domain or use the default.
          </p>
        </div>

        <InboxInterface initialAddress={address} sessionToken={sessionToken} />

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-4 mt-24 grid md:grid-cols-3 gap-8">
          <Feature
            icon={<Zap className="h-6 w-6 text-yellow-400" />}
            title="Instant & Real-time"
            desc="Emails arrive instantly via Webhooks. The inbox auto-refreshes in real-time."
          />
          <Feature
            icon={<Shield className="h-6 w-6 text-green-400" />}
            title="Privacy First"
            desc="No tracking. Emails traverse your infrastructure and are stored in Redis with 24h TTL."
          />
          <Feature
            icon={<Globe className="h-6 w-6 text-blue-400" />}
            title="Custom Domains"
            desc="Point your domain's MX records to your Cloudflare/Mailgun and route emails here."
          />
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 mt-12 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} VaultMail. Open Source.</p>
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
