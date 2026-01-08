"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Key, Shield, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MailboxVerifyModalProps {
  email: string;
  onVerified: (sessionToken: string) => void;
  onCancel?: () => void;
}

export function MailboxVerifyModal({
  email,
  onVerified,
  onCancel,
}: MailboxVerifyModalProps) {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleVerify = async () => {
    if (!recoveryKey.trim()) {
      toast.error("Please enter your recovery key");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          recoveryKey: recoveryKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Invalid recovery key");
        return;
      }

      if (data.sessionToken) {
        // Store session in localStorage for this email
        const sessions = JSON.parse(
          localStorage.getItem("mailbox_sessions") || "{}"
        );
        sessions[email.toLowerCase()] = {
          token: data.sessionToken,
          expiresAt: Date.now() + data.expiresIn * 1000,
        };
        localStorage.setItem("mailbox_sessions", JSON.stringify(sessions));

        toast.success("Access verified!");
        onVerified(data.sessionToken);
      }
    } catch (error) {
      toast.error("Failed to verify access");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleVerify();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={onCancel}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-50 w-full max-w-md"
        >
          {/* Glassmorphism Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
            {/* Gradient orbs for visual effect */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Content */}
            <div className="relative p-8 space-y-6">
              {/* Header */}
              <div className="text-center space-y-4">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-cyan-400" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                    Verify Access
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter your recovery key to access this mailbox. <br />
                    <span className="text-cyan-400/80 font-medium">
                      Each email requires separate verification.
                    </span>
                  </p>
                </div>
              </div>

              {/* Email Display */}
              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Protected Mailbox
                </p>
                <p className="font-mono text-sm text-white truncate">{email}</p>
              </div>

              {/* Recovery Key Input */}
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  Recovery Key
                </label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Paste your recovery key here..."
                    className="h-12 bg-black/30 border-white/10 font-mono text-sm pr-12 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {onCancel && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  className={`flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20 transition-all ${
                    !onCancel ? "w-full" : ""
                  }`}
                  onClick={handleVerify}
                  disabled={loading || !recoveryKey.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Access
                    </>
                  )}
                </Button>
              </div>

              {/* Footer Note */}
              <p className="text-xs text-center text-muted-foreground/70">
                Session expires in 24 hours for security.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
