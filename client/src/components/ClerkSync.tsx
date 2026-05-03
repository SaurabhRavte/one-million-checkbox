import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useAuth } from "../lib/AuthContext";

/**
 * Listens for Clerk auth changes and syncs to our backend session.
 */
export function ClerkSync() {
  const { isSignedIn, user: clerkUser } = useUser();
  const { user: backendUser, setClerkAuth } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !clerkUser) return;
    if (backendUser?.id === clerkUser.id) return;

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) return;

    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || undefined;

    setClerkAuth(clerkUser.id, email, name).catch(console.error);
  }, [isSignedIn, clerkUser, backendUser, setClerkAuth]);

  return null;
}
