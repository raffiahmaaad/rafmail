import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();


// Export hooks and methods for use in components
export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession,
  getSession,
} = authClient;
