import { InboxInterface } from "@/components/inbox-interface";
import { Shield, Key, User } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MailboxPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = (await params).username;
  const decoded = decodeURIComponent(username);

  // Validate username
  if (!decoded || decoded.length < 3) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span>RafMail</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 pt-4 pb-8">
        <InboxInterface initialUsername={decoded} />
      </div>

      <footer className="border-t border-white/5 py-6 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} RafMail. Open Source.</p>
      </footer>
    </main>
  );
}
