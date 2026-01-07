"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Copy,
  ExternalLink,
  LogOut,
  ArrowLeft,
  Key,
} from "lucide-react";
import Link from "next/link";

interface UserEmail {
  email: string;
  recoveryToken: string | null;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session) {
      fetchEmails();
    }
  }, [session]);

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/user/emails");
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const getQuickAccessUrl = (token: string) => {
    return `${window.location.origin}/recover?token=${token}`;
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                {session.user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-white/10 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Email List */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" />
              Your Email Addresses
            </h2>
            <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
              {emails.length} emails
            </span>
          </div>

          {emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No email addresses yet</p>
              <p className="text-sm mt-2">
                Generate emails on the{" "}
                <Link href="/" className="text-cyan-400 hover:underline">
                  home page
                </Link>{" "}
                while signed in
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((item) => (
                <div
                  key={item.email}
                  className="bg-black/20 rounded-xl p-4 space-y-3 border border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{item.email}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${item.email}`)}
                        className="h-8"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>

                  {item.recoveryToken && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Key className="h-3 w-3 text-cyan-400" />
                        <span className="text-xs text-muted-foreground">
                          Recovery Token
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-black/30 px-3 py-2 rounded truncate">
                          {item.recoveryToken}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            copyToClipboard(item.recoveryToken!, "Token")
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-black/30 px-3 py-2 rounded truncate">
                          {getQuickAccessUrl(item.recoveryToken)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              getQuickAccessUrl(item.recoveryToken!),
                              "URL"
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
