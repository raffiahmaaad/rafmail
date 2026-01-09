import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Clock, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedDomains: string[];
  onUpdateDomains: (domains: string[]) => void;
  currentAddress: string;
  onRetentionChange?: (seconds: number) => void;
}

export const RETENTION_OPTIONS = [
  { label: "1 Day", value: 86400 },
  { label: "1 Week", value: 604800 },
  { label: "1 Month", value: 2592000 },
  { label: "Permanent", value: -1 },
];

export function SettingsDialog({
  open,
  onOpenChange,
  currentAddress,
  onRetentionChange,
}: SettingsDialogProps) {
  const [retention, setRetention] = useState<number>(86400);
  const [saving, setSaving] = useState(false);

  const handleRetentionSave = async (seconds: number) => {
    setRetention(seconds);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: currentAddress,
          retentionSeconds: seconds,
          isLoggedIn: true,
        }),
      });
      localStorage.setItem("dispo_default_retention", seconds.toString());
      toast.success("Retention updated");
      if (onRetentionChange) onRetentionChange(seconds);
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("dispo_default_retention");
    if (saved) setRetention(parseInt(saved));
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => onOpenChange(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg z-10 mt-96"
            >
              <div className="rounded-2xl shadow-2xl border border-white/10 bg-zinc-900 flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <Settings2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-none">
                        Email Settings
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure inbox retention
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 hover:bg-white/10 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar bg-zinc-900">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-white/10 to-white/10 rounded-xl p-5 border border-white/5">
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Inbox Lifespan
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Configure how long emails persist in this inbox. Setting
                        a shorter duration improves privacy, while a longer
                        duration ensures you don't miss important emails.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Duration Selection
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {RETENTION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleRetentionSave(opt.value)}
                            disabled={saving}
                            className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                              retention === opt.value
                                ? "bg-white/10 border-white/50 text-white shadow-lg"
                                : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05] hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  retention === opt.value
                                    ? "border-white"
                                    : "border-white/20 group-hover:border-white/40"
                                }`}
                              >
                                {retention === opt.value && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="font-medium">{opt.label}</span>
                            </div>
                            {retention === opt.value && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/20 text-white">
                                ACTIVE
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      To manage custom domains, go to your{" "}
                      <a
                        href="/dashboard"
                        className="text-white underline hover:text-white/80"
                      >
                        Dashboard
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
