"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { EmailGenerator } from "@/components/email-generator";
import { RecoveryModal } from "@/components/recovery-modal";
import { Shield, Zap, Globe, Key, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  // No auto-redirect - user must explicitly create alias to go to mailbox

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span>RafMail</span>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setRecoveryOpen(true)}
              className="text-muted-foreground hover:text-white"
            >
              <Key className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Recover Email</span>
            </Button>

            <Link href={session ? "/dashboard" : "/auth/signin"}>
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                {session ? "Dashboard" : "Sign In"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 py-8 md:py-12 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4 mb-8 space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
            Disposable Email <br />
            for Developers
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Secure, serverless temporary email. Bring your own domain or use the
            default.
          </p>
        </div>

        <EmailGenerator />

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto px-4 mt-16 grid sm:grid-cols-3 gap-6">
          <Feature
            icon={<Zap className="h-5 w-5 text-yellow-400" />}
            title="Instant & Real-time"
            desc="Emails arrive instantly. Auto-refresh enabled."
          />
          <Feature
            icon={<Shield className="h-5 w-5 text-green-400" />}
            title="Privacy First"
            desc="No tracking. Emails stored with configurable TTL."
          />
          <Feature
            icon={<Globe className="h-5 w-5 text-blue-400" />}
            title="Custom Domains"
            desc="Use your own domain or our defaults."
          />
        </div>
      </div>

      <footer className="border-t border-white/5 py-6 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} RafMail. Open Source.</p>
      </footer>

      {/* Recovery Modal */}
      <RecoveryModal open={recoveryOpen} onOpenChange={setRecoveryOpen} />
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
    <div className="p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="mb-3 p-2.5 rounded-full bg-white/5 w-fit">{icon}</div>
      <h3 className="text-base font-bold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
