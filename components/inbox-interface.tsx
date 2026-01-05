'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RefreshCw, Copy, Mail, Loader2, ArrowRight, Trash2, Shield, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Types
interface Email {
  id: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
  to: string;
}

export function InboxInterface() {
  const [address, setAddress] = useState<string>('');
  const [domain, setDomain] = useState<string>('example.com'); // Default, can be changed
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load saved address
  useEffect(() => {
    const saved = localStorage.getItem('dispo_address');
    if (saved) {
        setAddress(saved);
        const savedDomain = saved.split('@')[1];
        if (savedDomain) setDomain(savedDomain);
    } else {
        generateAddress();
    }
  }, []);

  const generateAddress = () => {
    const random = Math.random().toString(36).substring(7);
    const newAddress = `user_${random}@${domain}`;
    setAddress(newAddress);
    localStorage.setItem('dispo_address', newAddress);
    setEmails([]);
    setSelectedEmail(null);
    toast.success('New address generated');
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDomain(e.target.value);
  }

  const updateAddressWithDomain = () => {
      const userPart = address.split('@')[0] || 'user';
      const newAddress = `${userPart}@${domain}`;
      setAddress(newAddress);
      localStorage.setItem('dispo_address', newAddress);
      setEmails([]); // Clear inbox on address change
      toast.info('Address updated');
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const fetchEmails = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/inbox?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.emails) {
        // Only update if changes to avoid jitter, or just replace for now
        // De-dupe could be handled here
        setEmails(data.emails);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Initial fetch
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchEmails]);
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header / Controls */}
      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Your Temporary Inbox
            </h2>
            <p className="text-muted-foreground text-sm">
              Waiting for emails at this address. Messages auto-delete after 24h.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                {loading ? 'Syncing...' : 'Live'}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
                <Input 
                    value={address.split('@')[0]} 
                    readOnly 
                    className="pr-4 font-mono text-lg bg-black/20 border-white/10 h-12"
                />
                <span className="absolute right-3 top-3 text-muted-foreground text-sm">@</span>
            </div>
            <div className="relative flex-1 max-w-[200px]">
                 <Input 
                    value={domain}
                    onChange={handleDomainChange}
                    onBlur={updateAddressWithDomain}
                    className="font-mono text-lg bg-black/20 border-white/10 h-12 border-l-0 rounded-l-none"
                    placeholder="domain.com"
                />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyAddress} variant="secondary" size="lg" className="h-12">
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button onClick={generateAddress} variant="outline" size="lg" className="h-12 border-white/10 hover:bg-white/5">
              <RefreshCw className="mr-2 h-4 w-4" /> New
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Email List */}
        <div className="md:col-span-1 glass-card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" /> Inbox
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">{emails.length}</span>
                </h3>
                <Button variant="ghost" size="icon" onClick={() => fetchEmails()} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {emails.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2 opacity-50"
                        >
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            <p>Waiting for incoming mail...</p>
                        </motion.div>
                    ) : (
                        emails.map((email) => (
                            <motion.div
                                key={email.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onClick={() => setSelectedEmail(email)}
                                className={cn(
                                    "p-4 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-white/5",
                                    selectedEmail?.id === email.id ? "bg-white/10 border-blue-500/30" : "bg-black/20"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium truncate max-w-[150px] text-sm">{email.from}</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <h4 className="text-sm font-semibold truncate text-blue-100">{email.subject}</h4>
                                <p className="text-xs text-muted-foreground truncate mt-1">{email.text.slice(0, 50)}...</p>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Email Content */}
        <div className="md:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col h-full bg-black/40">
            {selectedEmail ? (
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 space-y-4 bg-black/20">
                        <div className="flex justify-between items-start">
                            <h1 className="text-xl font-bold text-white">{selectedEmail.subject}</h1>
                            <span className="text-xs text-muted-foreground border border-white/10 px-2 py-1 rounded-md">
                                {new Date(selectedEmail.receivedAt).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                                {selectedEmail.from.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-white">{selectedEmail.from}</span>
                                <span className="text-muted-foreground text-xs">to {selectedEmail.to || address}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                         <div 
                            className="prose prose-sm max-w-none text-black"
                            dangerouslySetInnerHTML={{ __html: selectedEmail.html || `<p>${selectedEmail.text}</p>` }}
                        />
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                    <div className="p-4 rounded-full bg-white/5 border border-white/5">
                        <Mail className="h-8 w-8 opacity-50" />
                    </div>
                    <p>Select an email to read</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
