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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Key } from "lucide-react";

interface RecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecoveryModal({ open, onOpenChange }: RecoveryModalProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecover = async () => {
    if (!token.trim()) {
      toast.error("Please enter a recovery token");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/recovery?token=${encodeURIComponent(token.trim())}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Invalid token");
        return;
      }

      if (data.email) {
        toast.success("Email recovered!");
        localStorage.setItem("dispo_address", data.email);
        onOpenChange(false);
        router.push(`/${data.email}`);
      }
    } catch (error) {
      toast.error("Failed to recover email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-white" />
            Recover Email
          </DialogTitle>
          <DialogDescription>
            Enter your recovery token to restore access to your email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your recovery token here..."
            className="bg-black/20 border-white/10 font-mono text-sm"
            disabled={loading}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-white"
              onClick={handleRecover}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Recover"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
