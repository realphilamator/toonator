"use client";
import { useState, useEffect, useRef } from "react";
import { getUserColorData } from "@/lib/api";

// Module-level cache, same as the `cache` object in color-username.js
const colorCache = {};

/**
 * Returns a CSS class for a username link: 'admin' | 'mod' | 'russian' | 'foreign'
 * Mirrors the logic in color-username.js.
 */
export function useUsernameColor(username) {
  const [colorClass, setColorClass] = useState("");
  const fetching = useRef(false);

  useEffect(() => {
    if (!username || fetching.current) return;

    if (colorCache[username] !== undefined) {
      setColorClass(resolveClass(colorCache[username]));
      return;
    }

    fetching.current = true;
    getUserColorData(username)
      .then((data) => {
        colorCache[username] = data;
        setColorClass(resolveClass(data));
      })
      .catch(() => {
        colorCache[username] = { role: "user", russian: false };
        setColorClass("foreign");
      })
      .finally(() => {
        fetching.current = false;
      });
  }, [username]);

  return colorClass;
}

function resolveClass({ role, russian }) {
  if (role === "admin") return "admin";
  if (role === "mod") return "mod";
  if (russian) return "russian";
  return "foreign";
}
