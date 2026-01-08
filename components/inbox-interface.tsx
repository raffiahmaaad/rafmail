"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  RefreshCw,
  Copy,
  Mail,
  Loader2,
  ArrowRight,
  Trash2,
  Shield,
  Globe,
  History,
  ChevronDown,
  X,
  Settings2,
  Key,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Types
interface Email {
  id: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
  to: string;
}

import { SettingsDialog, RETENTION_OPTIONS } from "./settings-dialog";

// Helper to format sender name nicely
const formatSenderName = (from: string): string => {
  if (!from) return "Unknown";

  // Handle "Name <email@domain.com>" format
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch && nameMatch[1].trim()) {
    return nameMatch[1].trim();
  }

  // Handle bounce addresses like "bounce+xxx@domain.com"
  if (from.includes("bounce")) {
    const atIndex = from.lastIndexOf("@");
    if (atIndex !== -1) {
      const domain = from.substring(atIndex + 1);
      const domainName = domain.split(".")[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
  }

  // Handle "noreply@domain.com" or similar
  if (from.includes("noreply") || from.includes("no-reply")) {
    const atIndex = from.lastIndexOf("@");
    if (atIndex !== -1) {
      const domain = from.substring(atIndex + 1);
      const domainName = domain.split(".")[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
  }

  // Default: return email username or truncated
  const atIndex = from.indexOf("@");
  if (atIndex !== -1 && atIndex > 15) {
    return from.substring(0, 15) + "...";
  }

  if (atIndex !== -1) {
    return from.substring(0, atIndex);
  }

  return from;
};

// Helper to format sender email for display (clean up bounce addresses)
const formatSenderEmail = (from: string): string => {
  if (!from) return "";

  // Handle "Name <email@domain.com>" format - extract email
  const emailMatch = from.match(/<(.+)>/);
  if (emailMatch) {
    return emailMatch[1];
  }

  // Handle bounce addresses - extract clean email
  if (from.includes("bounce")) {
    const atIndex = from.lastIndexOf("@");
    if (atIndex !== -1) {
      const domain = from.substring(atIndex + 1);
      return `noreply@${domain}`;
    }
  }

  return from;
};

interface InboxInterfaceProps {
  initialAddress?: string;
  initialUsername?: string;
}

export function InboxInterface({
  initialAddress,
  initialUsername,
}: InboxInterfaceProps) {
  const [address, setAddress] = useState<string>(initialAddress || "");
  const [domain, setDomain] = useState<string>("rafxyz.web.id");
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [savedDomains, setSavedDomains] = useState<string[]>(["rafxyz.web.id"]);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [retention, setRetention] = useState<number>(86400);
  const [recoveryToken, setRecoveryToken] = useState<string>("");
  const [showRecoveryToken, setShowRecoveryToken] = useState(false);
  const [viewingRecoveryKey, setViewingRecoveryKey] = useState<string | null>(
    null
  );
  const [viewingRecoveryToken, setViewingRecoveryToken] = useState<string>("");
  const [loadingRecoveryKey, setLoadingRecoveryKey] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // Load saved data
  useEffect(() => {
    const savedDoms = localStorage.getItem("dispo_domains");
    const savedHist = localStorage.getItem("dispo_history");
    const savedRet = localStorage.getItem("dispo_default_retention");

    if (savedDoms) {
      setSavedDomains(JSON.parse(savedDoms));
    } else {
      localStorage.setItem("dispo_domains", JSON.stringify(["rafxyz.web.id"]));
    }

    if (savedHist) setHistory(JSON.parse(savedHist));
    if (savedRet) setRetention(parseInt(savedRet));

    // Handle initialUsername (from /mailbox/[username] route)
    if (initialUsername && !initialAddress) {
      const savedAddr = localStorage.getItem("dispo_address");
      let domainToUse = "rafxyz.web.id";
      if (savedAddr && savedAddr.includes("@")) {
        domainToUse = savedAddr.split("@")[1];
      }
      const fullAddress = `${initialUsername}@${domainToUse}`;
      setAddress(fullAddress);
      setDomain(domainToUse);
      localStorage.setItem("dispo_address", fullAddress);
    } else if (initialAddress) {
      setAddress(initialAddress);
      const parts = initialAddress.split("@");
      if (parts.length > 1) setDomain(parts[1]);
    } else {
      const saved = localStorage.getItem("dispo_address");
      if (saved) {
        setAddress(saved);
        const parts = saved.split("@");
        if (parts.length > 1) setDomain(parts[1]);
      } else {
        generateAddress();
      }
    }
  }, [initialAddress, initialUsername]);

  // Sync Address to URL (without reloading)
  useEffect(() => {
    if (address && address.includes("@")) {
      const username = address.split("@")[0];
      window.history.replaceState(null, "", `/mailbox/${username}`);
    }
  }, [address]);

  const addToHistory = (addr: string) => {
    if (!addr.includes("@")) return;

    setHistory((prev) => {
      // Prevent duplicates and limit to 10
      if (prev.includes(addr)) {
        // Move to top if exists
        return [addr, ...prev.filter((a) => a !== addr)];
      }
      const newHist = [addr, ...prev].slice(0, 10);
      localStorage.setItem("dispo_history", JSON.stringify(newHist));
      return newHist;
    });
  };

  const generateAddress = async () => {
    // Generate pronounceable random string (e.g. weidipoffeutre)
    const vowels = "aeiou";
    const consonants = "bcdfghjklmnpqrstvwxyz";
    let name = "";
    const length = Math.floor(Math.random() * 5) + 8; // 8-12 chars

    for (let i = 0; i < length; i++) {
      const isVowel = i % 2 === 1; // Start with consonant usually
      const set = isVowel ? vowels : consonants;
      name += set[Math.floor(Math.random() * set.length)];
    }

    const num = Math.floor(Math.random() * 9000) + 1000; // 4 digit number
    const newAddress = `${name}${num}@${domain}`;

    setAddress(newAddress);
    localStorage.setItem("dispo_address", newAddress);
    setEmails([]);
    setSelectedEmail(null);
    addToHistory(newAddress);

    // Generate recovery token
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAddress }),
      });
      const data = await res.json();
      if (data.token) {
        setRecoveryToken(data.token);
        setShowRecoveryToken(true);

        // Save token to localStorage for local lookup
        const savedTokens = JSON.parse(
          localStorage.getItem("dispo_tokens") || "{}"
        );
        savedTokens[newAddress] = data.token;
        localStorage.setItem("dispo_tokens", JSON.stringify(savedTokens));

        // If logged in, save to user's account
        if (session) {
          await fetch("/api/user/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: newAddress,
              recoveryToken: data.token,
            }),
          });
        }
      }
    } catch (error) {
      console.error("Failed to generate recovery token:", error);
    }

    toast.success("New alias created with recovery key!");
  };

  const fetchRecoveryKey = async (email: string) => {
    setLoadingRecoveryKey(true);
    setViewingRecoveryKey(email);

    // Check localStorage first
    const savedTokens = JSON.parse(
      localStorage.getItem("dispo_tokens") || "{}"
    );
    if (savedTokens[email]) {
      setViewingRecoveryToken(savedTokens[email]);
      setLoadingRecoveryKey(false);
      return;
    }

    // Fallback to API
    try {
      const res = await fetch(
        `/api/recovery/lookup?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (data.token) {
        setViewingRecoveryToken(data.token);
        // Save to localStorage for future use
        savedTokens[email] = data.token;
        localStorage.setItem("dispo_tokens", JSON.stringify(savedTokens));
      } else {
        toast.error("Recovery key not found for this email");
        setViewingRecoveryKey(null);
      }
    } catch (error) {
      console.error("Failed to fetch recovery key:", error);
      toast.error("Failed to fetch recovery key");
      setViewingRecoveryKey(null);
    } finally {
      setLoadingRecoveryKey(false);
    }
  };

  const copyRecoveryToken = () => {
    navigator.clipboard.writeText(viewingRecoveryToken);
    toast.success("Recovery key copied!");
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  const fetchEmails = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/inbox?address=${encodeURIComponent(address)}`
      );
      const data = await res.json();
      if (data.emails) {
        // Only update if changes to avoid jitter, or just replace for now
        // De-dupe could be handled here
        setEmails(data.emails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Initial fetch
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchEmails]);

  return (
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header / Controls */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Your Temporary Inbox
            </h2>
            <p className="text-muted-foreground text-sm">
              Waiting for emails at this address. Messages auto-delete after{" "}
              <span className="text-purple-400 font-medium">
                {RETENTION_OPTIONS.find((o) => o.value === retention)?.label ||
                  "24 Hours"}
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                loading ? "bg-yellow-400 animate-pulse" : "bg-green-400"
              }`}
            />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
              {loading ? "Syncing..." : "Live"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Email Input Row with Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Email Address Display - Read Only */}
            <div className="flex-1 min-w-[200px] h-12 px-4 flex items-center rounded-md border border-white/10 bg-black/20">
              <span className="font-medium   text-sm sm:text-base text-white truncate">
                {address}
              </span>
            </div>

            {/* Action Buttons - inline with input */}
            <div className="flex gap-2 items-center flex-shrink-0">
              {/* Copy Button */}
              <Button
                onClick={copyAddress}
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-12 sm:w-12 border border-white/10 hover:bg-white/5"
                title="Copy Address"
              >
                <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {/* Settings Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddDomainOpen(true)}
                className="h-10 w-10 sm:h-12 sm:w-12 border border-white/10 hover:bg-white/5"
                title="Settings"
              >
                <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {/* History Button */}
              <div className="relative">
                <Button
                  onClick={() => setShowHistory(!showHistory)}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 border border-white/10 hover:bg-white/5 relative",
                    showHistory && "bg-white/10 ring-2 ring-white/10"
                  )}
                  title="History"
                >
                  <History className="h-4 w-4 sm:h-5 sm:w-5" />
                  {history.length > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  )}
                </Button>

                <AnimatePresence>
                  {showHistory && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowHistory(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-14 w-80 rounded-xl p-0 z-50 border border-white/10 shadow-2xl overflow-hidden bg-zinc-900"
                      >
                        <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-zinc-800/50">
                          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                            History
                          </span>
                          {history.length > 0 && (
                            <button
                              onClick={() => {
                                setHistory([]);
                                localStorage.removeItem("dispo_history");
                              }}
                              className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                              <History className="h-8 w-8 opacity-20" />
                              <p className="text-sm">No recent addresses</p>
                            </div>
                          ) : (
                            history.map((histAddr) => (
                              <div
                                key={histAddr}
                                className="flex group items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
                              >
                                <div
                                  className="flex-1 min-w-0"
                                  onClick={() => {
                                    setAddress(histAddr);
                                    const parts = histAddr.split("@");
                                    if (parts[1]) setDomain(parts[1]);
                                    localStorage.setItem(
                                      "dispo_address",
                                      histAddr
                                    );
                                    setShowHistory(false);
                                  }}
                                >
                                  <p className="font-mono text-sm truncate text-gray-200">
                                    {histAddr}
                                  </p>
                                  <p className="textxs text-muted-foreground truncate opacity-50 text-[10px]">
                                    {emails.length > 0 && address === histAddr
                                      ? "Active"
                                      : "Click to restore"}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500/20 hover:text-cyan-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchRecoveryKey(histAddr);
                                  }}
                                  title="View recovery key"
                                >
                                  <Key className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newHist = history.filter(
                                      (h) => h !== histAddr
                                    );
                                    setHistory(newHist);
                                    localStorage.setItem(
                                      "dispo_history",
                                      JSON.stringify(newHist)
                                    );
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Create New Address Button */}
              <Button
                onClick={() => router.push("/")}
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-12 sm:w-12 border border-white/10 hover:bg-white/5"
                title="Create New Address"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>

        <SettingsDialog
          open={isAddDomainOpen}
          onOpenChange={setIsAddDomainOpen}
          savedDomains={savedDomains}
          currentAddress={address}
          onRetentionChange={setRetention}
          onUpdateDomains={(newDomains) => {
            const combined = [
              ...new Set([...["rafxyz.web.id"], ...newDomains]),
            ];
            setSavedDomains(combined);
            localStorage.setItem("dispo_domains", JSON.stringify(combined));
          }}
        />

        {/* Recovery Key View Dialog */}
        <AnimatePresence>
          {viewingRecoveryKey && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => {
                  setViewingRecoveryKey(null);
                  setViewingRecoveryToken("");
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-50 w-full max-w-md mx-4 glass-card rounded-2xl p-6 space-y-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-semibold text-lg">Recovery Key</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setViewingRecoveryKey(null);
                      setViewingRecoveryToken("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground font-mono truncate">
                  {viewingRecoveryKey}
                </p>

                {loadingRecoveryKey ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  </div>
                ) : viewingRecoveryToken ? (
                  <div className="space-y-3">
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Recovery Token
                      </p>
                      <code className="text-xs break-all text-cyan-300 block">
                        {viewingRecoveryToken}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
                        onClick={copyRecoveryToken}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Token
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Save this token to recover your email address later
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No recovery key found for this email</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 min-h-[400px] md:h-[600px]">
        {/* Email List */}
        <div className="md:col-span-1 glass-card rounded-2xl overflow-hidden flex flex-col h-[280px] sm:h-[350px] md:h-auto">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" /> Inbox
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">
                {emails.length}
              </span>
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchEmails()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {emails.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2 opacity-50"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  <p>Waiting for incoming mail...</p>
                </motion.div>
              ) : (
                emails.map((email) => (
                  <motion.div
                    key={email.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => setSelectedEmail(email)}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-white/5",
                      selectedEmail?.id === email.id
                        ? "bg-white/10 border-blue-500/30"
                        : ""
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium truncate max-w-[150px] text-sm">
                        {formatSenderName(email.from)}
                      </span>
                      <span className="text-[10px] text-white-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(email.receivedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold truncate text-muted-foreground">
                      {email.subject}
                    </h4>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Email Content */}
        <div className="md:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col h-[350px] sm:h-[400px] md:h-full">
          {selectedEmail ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-white/5 space-y-3 sm:space-y-4">
                <div className="flex justify-between items-start">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-white">
                    {selectedEmail.subject}
                  </h1>
                  <span className="text-xs text-muted-foreground border border-white/10 px-2 py-1 rounded-md">
                    {new Date(selectedEmail.receivedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                    {formatSenderName(selectedEmail.from)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white">
                      <span className="font-medium">
                        {formatSenderName(selectedEmail.from)}
                      </span>{" "}
                      <span className="text-muted-foreground text-xs">
                        &lt;{formatSenderEmail(selectedEmail.from)}&gt;
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      to {selectedEmail.to || address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden bg-white">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                          * { box-sizing: border-box; }
                          body {
                            margin: 0;
                            padding: 24px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-size: 14px;
                            line-height: 1.6;
                            color: #1a1a1a;
                            background: white;
                          }
                          img { max-width: 100%; height: auto; }
                          a { color: #0066cc; }
                          table { max-width: 100% !important; }
                        </style>
                      </head>
                      <body>
                        ${selectedEmail.html || `<p>${selectedEmail.text}</p>`}
                      </body>
                    </html>
                  `}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  title="Email content"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <div className="p-4 rounded-full bg-white/5 border border-white/5">
                <Mail className="h-8 w-8 opacity-50" />
              </div>
              <p>Select an email to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
