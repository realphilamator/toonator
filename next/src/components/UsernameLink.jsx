"use client";
import Link from "next/link";
import { useUsernameColor } from "@/hooks/color-username";

/**
 * Drop-in replacement for <a class="username" href="/user/X">X</a>.
 * Automatically fetches and applies the correct color class.
 */
export default function UsernameLink({ username, className = "", ...props }) {
  const colorClass = useUsernameColor(username);

  return (
    <Link
      href={`/user/${encodeURIComponent(username)}`}
      className={`username ${colorClass} ${className}`.trim()}
      {...props}
    >
      {username}
    </Link>
  );
}
