"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Shield,
  Mail,
  Globe,
  Trash2,
  Eye,
  Search,
  Loader2,
  Plus,
  LogOut,
  RefreshCw,
  Lock,
  AlertTriangle,
  Key,
  User,
  Star,
  Infinity,
} from "lucide-react";
import { motion } from "framer-motion";

interface EmailData {
  address: string;
  source: "user" | "guest";
  userId?: string;
  createdAt?: string;
}

interface InboxEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
}

interface GlobalDomain {
  id: string;
  domain: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
}

export default function AdminPage() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Data state
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [domains, setDomains] = useState<GlobalDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [viewingInbox, setViewingInbox] = useState<string | null>(null);
  const [inboxEmails, setInboxEmails] = useState<InboxEmail[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  // Check existing session on load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/emails");
      if (res.ok) {
        setIsLoggedIn(true);
        fetchData();
      }
    } catch {
      // Not logged in
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchData = () => {
    fetchEmails();
    fetchDomains();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, masterKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsLoggedIn(true);
        toast.success("Welcome, Admin!");
        fetchData();
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsLoggedIn(false);
      setEmails([]);
      setDomains([]);
      toast.success("Logged out");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/emails");
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
      }
    } catch (error) {
      toast.error("Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/admin/domains");
      const data = await res.json();
      if (data.domains) {
        setDomains(data.domains);
      }
    } catch (error) {
      toast.error("Failed to fetch domains");
    }
  };

  const viewInbox = async (address: string) => {
    setViewingInbox(address);
    setLoadingInbox(true);
    try {
      const res = await fetch(
        `/api/admin/inbox?address=${encodeURIComponent(address)}`
      );
      const data = await res.json();
      setInboxEmails(data.emails || []);
    } catch (error) {
      toast.error("Failed to load inbox");
    } finally {
      setLoadingInbox(false);
    }
  };

  const deleteEmail = async (address: string) => {
    if (!confirm(`Delete ${address} and all its emails?`)) return;

    try {
      const res = await fetch("/api/admin/emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (res.ok) {
        setEmails(emails.filter((e) => e.address !== address));
        toast.success("Email deleted");
      } else {
        toast.error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;

    setAddingDomain(true);
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setDomains([...domains, data.domain]);
        setNewDomain("");
        toast.success("Domain added");
      } else {
        toast.error(data.error || "Failed to add domain");
      }
    } catch (error) {
      toast.error("Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  };

  const deleteDomain = async (domain: string) => {
    if (!confirm(`Delete domain ${domain}?`)) return;

    try {
      const res = await fetch("/api/admin/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (res.ok) {
        setDomains(domains.filter((d) => d.domain !== domain));
        toast.success("Domain deleted");
      } else {
        toast.error("Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const setDefaultDomain = async (domain: string) => {
    try {
      const res = await fetch("/api/admin/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, isDefault: true }),
      });

      if (res.ok) {
        // Update local state
        setDomains(
          domains.map((d) => ({
            ...d,
            isDefault: d.domain === domain,
          }))
        );
        toast.success(`${domain} is now the default domain`);
      } else {
        toast.error("Failed to set default");
      }
    } catch (error) {
      toast.error("Failed to set default");
    }
  };

  const makePermanent = async (address: string) => {
    try {
      const res = await fetch("/api/admin/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || `Made ${address} permanent`);
      } else {
        toast.error(data.error || "Failed to make permanent");
      }
    } catch (error) {
      toast.error("Failed to make permanent");
    }
  };

  const makeAllPermanent = async () => {
    showConfirm(
      "Make All Permanent",
      "Make ALL user emails permanent? This will remove TTL from all logged-in user data.",
      async () => {
        try {
          const res = await fetch("/api/admin/persist", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json();

          if (res.ok) {
            toast.success(
              data.message || `Made ${data.persistedCount} emails permanent`
            );
          } else {
            toast.error(data.error || "Failed to make permanent");
          }
        } catch (error) {
          toast.error("Failed to make permanent");
        }
      }
    );
  };

  const filteredEmails = emails.filter((e) =>
    e.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/50">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Login Form
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden flex flex-col">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Navbar */}
        <header className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-xl">
              <span>RafMail</span>
            </a>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                  <div className="h-14 w-14 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                    <Shield className="h-7 w-7 text-red-400" />
                  </div>
                  <CardTitle className="text-lg md:text-xl">
                    Admin Panel
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Enter your credentials to access the admin area
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="grid gap-4">
                    {/* Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400/90">
                        This area is restricted. Unauthorized access attempts
                        are logged.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Admin Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="masterKey">Master Key</Label>
                      <Input
                        id="masterKey"
                        type="password"
                        placeholder="Enter master key"
                        value={masterKey}
                        onChange={(e) => setMasterKey(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loggingIn || !email || !password || !masterKey}
                      className="w-full"
                    >
                      {loggingIn ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Login to Admin"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <div className="text-center">
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      {/* Background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-red-400" />
              </div>
              <span className="text-xl font-bold text-white">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-white hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{emails.length}</p>
                <p className="text-xs text-muted-foreground">Total Emails</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Globe className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {domains.length}
                </p>
                <p className="text-xs text-muted-foreground">Global Domains</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {emails.filter((e) => e.source === "user").length}
                </p>
                <p className="text-xs text-muted-foreground">User Emails</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {emails.filter((e) => e.source === "guest").length}
                </p>
                <p className="text-xs text-muted-foreground">Guest Emails</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Management */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Addresses
            </h2>
            <div className="flex items-center gap-2">
              {emails.filter((e) => e.source === "user").length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeAllPermanent}
                  className="h-8 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                >
                  <Infinity className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Make All Permanent</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchEmails}
                disabled={loading}
                className="h-8 w-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/30 border-white/10"
            />
          </div>

          {/* Email List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/50" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No emails found
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.address}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        email.source === "user"
                          ? "bg-purple-500/20"
                          : "bg-amber-500/20"
                      }`}
                    >
                      <Mail
                        className={`h-4 w-4 ${
                          email.source === "user"
                            ? "text-purple-400"
                            : "text-amber-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium text-white truncate max-w-[180px] sm:max-w-[300px]"
                        title={email.address}
                      >
                        {email.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {email.source === "user" ? "Registered User" : "Guest"}
                        {email.createdAt &&
                          ` • ${new Date(email.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 justify-end sm:justify-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => viewInbox(email.address)}
                      className="h-8 w-8 text-muted-foreground hover:text-white"
                      title="View Inbox"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {email.source === "user" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => makePermanent(email.address)}
                        className="h-8 w-8 text-muted-foreground hover:text-green-400"
                        title="Make Permanent"
                      >
                        <Infinity className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEmail(email.address)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Domain Management */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Domains
          </h2>
          <p className="text-sm text-muted-foreground">
            Domains added here will be available for all users. Click the star
            to set as default.
          </p>

          {/* Current Default */}
          {domains.some((d) => d.isDefault) && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-sm text-amber-400">
                Default:{" "}
                <strong>{domains.find((d) => d.isDefault)?.domain}</strong>
              </span>
            </div>
          )}

          {/* Add Domain */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter domain (e.g. example.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="bg-black/30 border-white/10"
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
            />
            <Button
              onClick={addDomain}
              disabled={addingDomain || !newDomain.trim()}
              className="bg-white hover:bg-white/90 text-black shrink-0"
            >
              {addingDomain ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Domain List */}
          <div className="space-y-2">
            {domains.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No global domains configured. Add one above.
              </div>
            ) : (
              domains.map((domain) => (
                <div
                  key={domain.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors gap-2 ${
                    domain.isDefault
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-black/20 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        domain.isDefault ? "bg-amber-500/20" : "bg-green-500/20"
                      }`}
                    >
                      {domain.isDefault ? (
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      ) : (
                        <Globe className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className="font-medium text-white truncate block max-w-[150px] sm:max-w-none"
                        title={domain.domain}
                      >
                        {domain.domain}
                      </span>
                      {domain.isDefault && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!domain.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDefaultDomain(domain.domain)}
                        className="h-8 w-8 text-muted-foreground hover:text-amber-400"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDomain(domain.domain)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      title="Delete domain"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inbox Viewer Dialog */}
      <Dialog open={!!viewingInbox} onOpenChange={() => setViewingInbox(null)}>
        <DialogContent className="sm:max-w-2xl glass-card border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Mail className="h-5 w-5" />
              Inbox: {viewingInbox}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4">
            {loadingInbox ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/50" />
              </div>
            ) : inboxEmails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No emails in inbox
              </div>
            ) : (
              inboxEmails.map((email, i) => (
                <div
                  key={email.id || i}
                  className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{email.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        From: {email.from}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(email.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-white/80 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {email.text || "(No text content)"}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Confirm Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-50 w-full max-w-md"
          >
            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Infinity className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {confirmDialog.title}
                </h3>
              </div>

              <p className="text-sm text-muted-foreground">
                {confirmDialog.message}
              </p>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1 h-11 border border-white/10 hover:bg-white/5"
                  onClick={() =>
                    setConfirmDialog({ ...confirmDialog, open: false })
                  }
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog({ ...confirmDialog, open: false });
                  }}
                >
                  <Infinity className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
