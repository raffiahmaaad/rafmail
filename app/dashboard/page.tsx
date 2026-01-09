"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
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
import {
  Loader2,
  Mail,
  Copy,
  ExternalLink,
  LogOut,
  Key,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Globe,
  Plus,
  HelpCircle,
  CheckCircle2,
  Shield,
  RefreshCw,
  XCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_DOMAINS = ["rafxyz.web.id"];

interface UserEmail {
  email: string;
  recoveryToken: string | null;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Domain management state
  const [savedDomains, setSavedDomains] = useState<string[]>(DEFAULT_DOMAINS);
  const [newDomain, setNewDomain] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);

  // Domain verification state
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<{
    domain: string;
    verified: boolean;
    mxRecords: string[];
    error?: string;
    message?: string;
  } | null>(null);
  const [verifiedDomains, setVerifiedDomains] = useState<Set<string>>(
    new Set()
  );
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [addingDomain, setAddingDomain] = useState(false);

  // Fetch domains from API
  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/user/domains");
      const data = await res.json();
      if (data.domains) {
        setSavedDomains(data.domains);
      }
      // Load verified domains from API response
      if (data.customDomains) {
        const verified = data.customDomains
          .filter((d: { domain: string; verified: boolean }) => d.verified)
          .map((d: { domain: string }) => d.domain);
        setVerifiedDomains(new Set(verified));
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
    } finally {
      setDomainsLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin?callbackUrl=/dashboard");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session) {
      fetchEmails();
      fetchDomains();
    }
  }, [session]);

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/user/emails");
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const deleteEmail = async (email: string) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setEmails(emails.filter((e) => e.email !== email));
        toast.success("Email deleted");
        setDeleteDialogOpen(false);
        setEmailToDelete(null);
      } else {
        toast.error("Failed to delete email");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete email");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (email: string) => {
    setEmailToDelete(email);
    setDeleteDialogOpen(true);
  };

  const toggleExpand = (email: string) => {
    setExpandedEmail(expandedEmail === email ? null : email);
  };

  // Domain management functions using API
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;

    if (savedDomains.includes(domain)) {
      toast.error("Domain already added");
      return;
    }

    setAddingDomain(true);
    try {
      const res = await fetch("/api/user/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();

      if (res.ok) {
        setSavedDomains([...savedDomains, data.domain]);
        setNewDomain("");
        toast.success("Domain added successfully");
      } else {
        toast.error(data.error || "Failed to add domain");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domain: string) => {
    if (DEFAULT_DOMAINS.includes(domain)) {
      toast.error("Cannot delete default domain");
      return;
    }

    try {
      const res = await fetch("/api/user/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (res.ok) {
        setSavedDomains(savedDomains.filter((d) => d !== domain));
        toast.success("Domain removed");
      } else {
        toast.error("Failed to remove domain");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove domain");
    }
  };

  const customDomains = savedDomains.filter(
    (d) => !DEFAULT_DOMAINS.includes(d)
  );

  // Domain verification function
  const verifyDomain = async (domain: string) => {
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) return;

    setVerifyingDomain(true);
    setDomainStatus(null);

    try {
      const res = await fetch("/api/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: cleanDomain }),
      });
      const data = await res.json();
      setDomainStatus({ ...data, domain: cleanDomain });

      if (data.verified) {
        setVerifiedDomains((prev) => {
          const newSet = new Set(prev).add(cleanDomain);
          return newSet;
        });
        // Update domain verified status in database
        try {
          await fetch("/api/user/domains", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: cleanDomain, verified: true }),
          });
        } catch (e) {
          console.error("Failed to save verified status:", e);
        }
        toast.success("Domain verified successfully!");
      } else {
        toast.error(data.error || "Domain verification failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to verify domain");
    } finally {
      setVerifyingDomain(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/50">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">RafMail</span>
            </Link>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-white hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your email addresses
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white font-medium">
                  {session.user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm">
                <p className="text-white font-medium truncate max-w-[200px]">
                  {session.user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              Your Email Addresses
            </h2>
            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full text-muted-foreground">
              {emails.length} {emails.length === 1 ? "email" : "emails"}
            </span>
          </div>

          {emails.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Mail className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-white font-medium">No email addresses yet</p>
              <p className="text-sm mt-2 text-muted-foreground">
                Create an email on the{" "}
                <Link href="/" className="text-white hover:underline">
                  home page
                </Link>{" "}
                while signed in
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((item) => (
                <motion.div
                  key={item.email}
                  layout
                  className="bg-black/30 rounded-xl border border-white/5 overflow-hidden"
                >
                  {/* Email Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleExpand(item.email)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-white/70" />
                      </div>
                      <span className="font-medium text-sm text-white truncate">
                        {item.email}
                      </span>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${item.email}`);
                        }}
                        className="h-8 text-muted-foreground hover:text-white hover:bg-white/5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(item.email);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        title="Delete email"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {item.recoveryToken && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white"
                        >
                          {expandedEmail === item.email ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Recovery Token */}
                  <AnimatePresence>
                    {expandedEmail === item.email && item.recoveryToken && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/5"
                      >
                        <div className="p-4 space-y-3 bg-black/20">
                          <div className="flex items-center gap-2">
                            <Key className="h-3.5 w-3.5 text-white/50" />
                            <span className="text-xs text-muted-foreground font-medium">
                              Recovery Token
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-black/40 rounded-lg px-4 py-3 border border-white/5">
                              <code className="text-xs text-white/80 break-all">
                                {item.recoveryToken}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 flex-shrink-0 hover:bg-white/5"
                              onClick={() =>
                                copyToClipboard(item.recoveryToken!, "Token")
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Domains Section */}
        <div className="glass-card rounded-xl sm:rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Custom Domains
            </h2>
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">How to add domain</span>
              <span className="sm:hidden">Tutorial</span>
              {showTutorial ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          

          {/* Add Domain Form */}
          <form onSubmit={handleAddDomain} className="space-y-3">
            <Input
              placeholder="Enter your domain (e.g. mydomain.com)"
              value={newDomain}
              onChange={(e) => {
                setNewDomain(e.target.value);
                setDomainStatus(null);
              }}
              className="bg-black/30 border-white/10 focus-visible:ring-white/20 h-11"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!newDomain.trim() || verifyingDomain}
                onClick={() => verifyDomain(newDomain)}
                className="flex-1 sm:flex-none border-white/10 hover:bg-white/5 h-10"
              >
                {verifyingDomain ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-1.5" />
                    Verify
                  </>
                )}
              </Button>
              <Button
                type="submit"
                disabled={!newDomain.trim() || addingDomain}
                className="flex-1 sm:flex-none bg-white hover:bg-white/90 text-black h-10"
              >
                {addingDomain ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add
                  </>
                )}
              </Button>
            </div>

            {/* Verification Status */}
            {domainStatus && (
              <div
                className={`p-4 rounded-xl border ${
                  domainStatus.verified
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <p
                      className={`text-sm font-medium ${domainStatus.verified ? "text-green-400" : "text-red-400"}`}
                    >
                      {domainStatus.verified
                        ? "Domain Verified ✓"
                        : "Verification Failed"}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {domainStatus.message || domainStatus.error}
                    </p>
                    {domainStatus.mxRecords &&
                      domainStatus.mxRecords.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-2">
                            MX Records found:
                          </p>
                          <div className="bg-black/30 rounded-lg p-3 space-y-1.5 overflow-x-auto">
                            {domainStatus.mxRecords.map(
                              (record: string, i: number) => (
                                <code
                                  key={i}
                                  className="block text-[11px] sm:text-xs text-white/70 whitespace-nowrap"
                                >
                                  {record}
                                </code>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Domain List */}
          <div className="space-y-2">
            {/* Default Domain */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="font-medium text-sm text-white">
                  {DEFAULT_DOMAINS[0]}
                </span>
              </div>
              <span className="text-xs bg-white/10 text-muted-foreground px-2 py-1 rounded">
                Default
              </span>
            </div>

            {/* Custom Domains */}
            {customDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 group hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {verifiedDomains.has(domain) ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="font-medium text-sm text-white">
                    {domain}
                  </span>
                  {!verifiedDomains.has(domain) && (
                    <span className="text-xs text-amber-400/70">
                      (unverified)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!verifiedDomains.has(domain) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => verifyDomain(domain)}
                      disabled={verifyingDomain}
                      className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Verify domain"
                    >
                      {verifyingDomain && domainStatus?.domain === domain ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDomain(domain)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {customDomains.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No custom domains added yet
              </p>
            )}
          </div>
        </div>


      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              Delete Email
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this email address? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-black/30 rounded-lg p-4 border border-white/5 mt-2">
            <p className="text-sm text-white font-medium break-all">
              {emailToDelete}
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-white/10 hover:bg-white/5"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => emailToDelete && deleteEmail(emailToDelete)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Delete</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
