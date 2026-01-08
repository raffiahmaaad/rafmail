"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Key, Link2 } from "lucide-react";

interface RecoveryTokenDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  email: string;
}

export function RecoveryTokenDisplay({
  open,
  onOpenChange,
  token,
  email,
}: RecoveryTokenDisplayProps) {
  const quickAccessUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/recover?token=${token}`
      : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-400">
            <Key className="h-5 w-5" />
            Recovery Key Generated
          </DialogTitle>
          <DialogDescription>
            Save this key to recover access to{" "}
            <span className="text-cyan-400 font-mono">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Recovery Token */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Key className="h-3 w-3 text-cyan-400" />
              RECOVERY TOKEN
            </label>
            <div className="flex gap-2">
              <Input
                value={token}
                readOnly
                className="bg-black/30 border-white/10 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 border-white/10"
                onClick={() => copyToClipboard(token, "Token")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Access URL */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3 text-cyan-400" />
              QUICK ACCESS URL
            </label>
            <div className="flex gap-2">
              <Input
                value={quickAccessUrl}
                readOnly
                className="bg-black/30 border-white/10 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 border-white/10"
                onClick={() => copyToClipboard(quickAccessUrl, "URL")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-200">
            ⚠️ Save this key securely! It cannot be recovered if lost.
          </div>

          <Button
            className="w-full bg-white"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
