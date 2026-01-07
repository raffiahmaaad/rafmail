"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RecoverPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setError("No recovery token provided");
      return;
    }

    validateToken(token);
  }, [searchParams]);

  const validateToken = async (token: string) => {
    try {
      const res = await fetch(
        `/api/recovery?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("error");
        setError(data.error || "Invalid token");
        return;
      }

      if (data.email) {
        toast.success("Email recovered successfully!");
        // Save to localStorage and redirect
        localStorage.setItem("dispo_address", data.email);
        router.push(`/${data.email}`);
      }
    } catch (error) {
      setStatus("error");
      setError("Failed to validate token");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="glass-card rounded-2xl p-8 text-center space-y-4 max-w-md w-full">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
            <h1 className="text-xl font-bold">Recovering Email</h1>
            <p className="text-muted-foreground text-sm">
              Validating your recovery token...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-red-400">Recovery Failed</h1>
            <p className="text-muted-foreground text-sm">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="text-cyan-400 hover:underline text-sm"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
