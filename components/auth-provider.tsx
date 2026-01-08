"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={(path) => router.push(path)}
      replace={(path) => router.replace(path)}
      localization={{}}
    >
      {children}
    </AuthUIProvider>
  );
}
