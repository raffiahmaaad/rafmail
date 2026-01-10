import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";

// Outfit is very similar to Google Sans and is publicly available
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "RafMail - Secure Disposable Email",
  description:
    "Temporary email service deployed on Vercel with custom domains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={outfit.className}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
