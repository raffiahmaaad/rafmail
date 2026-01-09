"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Mail,
  Shuffle,
  User,
  Globe,
  Clock,
  Zap,
  RefreshCw,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { generateEmailUsername } from "@/lib/name-generator";

const DURATION_OPTIONS = [
  { label: "1h", value: 3600, description: "1 Hour" },
  { label: "24h", value: 86400, description: "24 Hours" },
  { label: "7d", value: 604800, description: "7 Days" },
  { label: "30d", value: 2592000, description: "30 Days" },
  {
    label: "∞",
    value: -1,
    description: "Permanent - Your email never expires",
  },
];

const DEFAULT_DOMAINS = ["rafxyz.web.id"];

interface EmailGeneratorProps {
  onAliasCreated?: (email: string, token: string, duration: number) => void;
}

export function EmailGenerator({ onAliasCreated }: EmailGeneratorProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [emailType, setEmailType] = useState<"random" | "custom">("random");
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState(DEFAULT_DOMAINS[0]);
  const [savedDomains, setSavedDomains] = useState<string[]>(DEFAULT_DOMAINS);
  const [globalDomainsList, setGlobalDomainsList] =
    useState<string[]>(DEFAULT_DOMAINS);
  const [personalDomainsList, setPersonalDomainsList] = useState<string[]>([]);
  // Default: permanent for logged-in, 24h for guest
  const [duration, setDuration] = useState(
    session ? DURATION_OPTIONS[4].value : 3600
  );
  const [loading, setLoading] = useState(false);
  const [generatingRandom, setGeneratingRandom] = useState(false);

  // Update duration when session changes
  useEffect(() => {
    if (session) {
      setDuration(DURATION_OPTIONS[4].value); // Permanent for logged-in users
    } else {
      setDuration(3600); // 1h for guests
    }
  }, [session]);

  // Generate random username using real names from various countries
  const generateRandomUsername = () => {
    return generateEmailUsername();
  };

  // Load domains from API (includes global domains for all users)
  useEffect(() => {
    // Generate initial random username
    setUsername(generateRandomUsername());

    // Fetch domains (works for both logged-in and guest users)
    const fetchDomains = async () => {
      try {
        const res = await fetch("/api/user/domains");
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
          setSavedDomains(data.domains);

          // Separate global and personal domains
          const customDomainNames = (data.customDomains || []).map(
            (d: any) => d.domain || d
          );
          const globalDomains = data.domains.filter(
            (d: string) => !customDomainNames.includes(d)
          );
          setGlobalDomainsList(globalDomains);
          setPersonalDomainsList(customDomainNames);

          // For guests: randomly select a domain
          // For logged-in users: use default domain
          if (!session) {
            const randomIndex = Math.floor(Math.random() * data.domains.length);
            setDomain(data.domains[randomIndex]);
          } else if (!data.domains.includes(domain)) {
            // Use default domain if available, otherwise first domain
            const defaultDomain = data.defaultDomain || data.domains[0];
            setDomain(defaultDomain);
          }
        }
      } catch (error) {
        console.error("Error fetching domains:", error);
        // Fallback to default domains
        setSavedDomains(DEFAULT_DOMAINS);
        setGlobalDomainsList(DEFAULT_DOMAINS);
      }
    };
    fetchDomains();
  }, [session]);

  const handleRefreshUsername = () => {
    setGeneratingRandom(true);
    setTimeout(() => {
      setUsername(generateRandomUsername());
      // Also randomize domain for guests
      if (!session && savedDomains.length > 0) {
        const randomIndex = Math.floor(Math.random() * savedDomains.length);
        setDomain(savedDomains[randomIndex]);
      }
      setGeneratingRandom(false);
    }, 300);
  };

  const handleCreateAlias = async () => {
    const finalUsername = emailType === "random" ? username : username.trim();

    if (!finalUsername) {
      toast.error("Please enter an email name");
      return;
    }

    if (finalUsername.length < 3) {
      toast.error("Email name must be at least 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(finalUsername)) {
      toast.error(
        "Email name can only contain letters, numbers, dots, underscores, and hyphens"
      );
      return;
    }

    const email = `${finalUsername}@${domain}`;
    setLoading(true);

    try {
      // Generate recovery token (pass session info for TTL decision)
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, isLoggedIn: !!session }),
      });
      const data = await res.json();

      if (!data.token) {
        throw new Error("Failed to generate recovery token");
      }

      // Save data - database for logged-in users, localStorage for guests
      if (!session) {
        localStorage.setItem("dispo_address", email);
        localStorage.setItem("dispo_default_retention", duration.toString());

        const savedTokens = JSON.parse(
          localStorage.getItem("dispo_tokens") || "{}"
        );
        savedTokens[email] = data.token;
        localStorage.setItem("dispo_tokens", JSON.stringify(savedTokens));

        // Add to history
        const history = JSON.parse(
          localStorage.getItem("dispo_history") || "[]"
        );
        if (!history.includes(email)) {
          history.unshift(email);
          localStorage.setItem(
            "dispo_history",
            JSON.stringify(history.slice(0, 10))
          );
        }
      } else {
        // Save to database for logged-in users
        await fetch("/api/user/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            recoveryToken: data.token,
            retentionSeconds: duration,
          }),
        });
        await fetch("/api/user/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        await fetch("/api/user/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultRetention: duration,
            currentAddress: email,
          }),
        });
      }

      // Save retention setting
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: email,
          retentionSeconds: duration,
          isLoggedIn: !!session,
        }),
      });

      // AUTO-CREATE SESSION: So creator can access mailbox immediately without entering key
      try {
        const verifyRes = await fetch("/api/verify-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            recoveryKey: data.token,
            isLoggedIn: !!session,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.sessionToken) {
          // Store session - database for logged-in, localStorage for guests
          if (session) {
            await fetch("/api/user/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
          } else {
            const sessions = JSON.parse(
              localStorage.getItem("mailbox_sessions") || "{}"
            );
            sessions[email.toLowerCase()] = {
              token: verifyData.sessionToken,
              expiresAt: Date.now() + verifyData.expiresIn * 1000,
            };
            localStorage.setItem("mailbox_sessions", JSON.stringify(sessions));
          }
        }
      } catch (verifyError) {
        console.error("Failed to auto-create session:", verifyError);
      }

      toast.success("Email alias created!");

      if (onAliasCreated) {
        onAliasCreated(email, data.token, duration);
      }

      // Navigate to mailbox
      router.push(`/mailbox/${finalUsername}`);
    } catch (error) {
      console.error("Failed to create alias:", error);
      toast.error("Failed to create email alias");
    } finally {
      setLoading(false);
    }
  };

  const selectedDurationOption = DURATION_OPTIONS.find(
    (d) => d.value === duration
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                Create Email Alias
              </h2>
              <p className="text-sm text-muted-foreground">
                Generate a disposable email address
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Email Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Email Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/20 border border-white/5">
              <button
                onClick={() => setEmailType("random")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                  emailType === "random"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <Shuffle className="h-4 w-4" />
                Random
              </button>
              <button
                onClick={() => setEmailType("custom")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                  emailType === "custom"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <User className="h-4 w-4" />
                Custom
              </button>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {emailType === "random" ? "Generated Email" : "Your Email Name"}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))
                  }
                  placeholder="yourname"
                  disabled={emailType === "random"}
                  className={cn(
                    "font-medium text-sm bg-black/30 border-white/10 h-12 pr-32",
                    emailType === "random" && "text-white"
                  )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 max-w-[45%]">
                  <span
                    className="text-sm text-muted-foreground truncate"
                    title={`@${domain}`}
                  >
                    @{domain}
                  </span>
                  {emailType === "random" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-white/10 flex-shrink-0"
                      onClick={handleRefreshUsername}
                      disabled={generatingRandom}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          generatingRandom && "animate-spin"
                        )}
                      />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {emailType === "custom" && (
              <p className="text-xs text-muted-foreground">
                3-30 characters: letters, numbers, dots, underscores, hyphens
              </p>
            )}
          </div>

          {/* Domain Selector - Only for logged-in users */}
          {session && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                Domain
              </label>
              <div className="relative">
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full h-12 px-4 pr-10 rounded-md bg-black/30 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  {globalDomainsList.length > 0 && (
                    <optgroup label="🌐 Global Domains" className="bg-zinc-900">
                      {globalDomainsList.map((d) => (
                        <option key={d} value={d} className="bg-zinc-900">
                          {d}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {personalDomainsList.length > 0 && (
                    <optgroup label="👤 My Domains" className="bg-zinc-900">
                      {personalDomainsList.map((d) => (
                        <option key={d} value={d} className="bg-zinc-900">
                          {d}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-xs text-muted-foreground">
                Global domains are available to everyone. Add custom domains in
                Dashboard.
              </p>
            </div>
          )}

          {/* Duration Selector - Only for logged-in users */}
          {session ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                Email Duration
              </label>
              <div className="grid grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={cn(
                      "py-3 px-2 rounded-xl font-medium text-sm transition-all border",
                      duration === opt.value
                        ? "bg-white/20 text-white border-muted-foreground"
                        : "bg-black/20 text-white border-white/5 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/50 flex items-center gap-1">
                <span></span>
                {selectedDurationOption?.description}
              </p>
            </div>
          ) : (
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Guest Mode</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Email expires in{" "}
                <span className="text-white font-medium">1 hour</span>.
                <a
                  href="/auth/signin"
                  className="text-white underline hover:text-white/80 ml-1"
                >
                  Sign in
                </a>{" "}
                for permanent emails.
              </p>
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreateAlias}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-white"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              "Create Alias"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
