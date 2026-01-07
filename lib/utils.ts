import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract email address from a string that might contain name and email
 * e.g., "John Doe <john@example.com>" -> "john@example.com"
 */
export function extractEmail(input: string): string | null {
  if (!input) return null;
  
  // Check if it's in format "Name <email@domain.com>"
  const angleMatch = input.match(/<([^>]+)>/);
  if (angleMatch) {
    return angleMatch[1].toLowerCase().trim();
  }
  
  // Check if it's a plain email
  const emailMatch = input.match(/[^\s<>]+@[^\s<>]+\.[^\s<>]+/);
  if (emailMatch) {
    return emailMatch[0].toLowerCase().trim();
  }
  
  // Return trimmed lowercase if it looks like an email
  const trimmed = input.toLowerCase().trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  
  return null;
}
