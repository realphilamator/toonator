"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/config";

/**
 * Mirrors the auth state logic from auth.js.
 * Returns the current Supabase user (or null) and a signOut helper.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    db.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes (login / logout)
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await db.auth.signOut();
  }

  return { user, loading, signOut };
}
