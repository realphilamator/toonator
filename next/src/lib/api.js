// API — mirrors /js/api.js exactly, adapted for Next.js imports
import { db, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function supabaseRequest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function rpc(fn, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) return null;
  return res.json();
}

export function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
}

// ── Profile ───────────────────────────────────────────────────────────────────

/** Uses the real get_user_by_username RPC (same as original api.js) */
export async function getProfileByUsername(username) {
  const { data: profile, error } = await db.rpc("get_user_by_username", {
    p_username: username,
  });
  return {
    profile: profile && profile.length > 0 ? profile[0] : null,
    error,
  };
}

export async function getProfileStats(userId) {
  const [{ count: totalToons }, { count: draftCount }, { count: commentCount }] =
    await Promise.all([
      db
        .from("animations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      db
        .from("animations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("draft", true),
      db
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);
  return {
    totalToons: totalToons || 0,
    draftCount: draftCount || 0,
    commentCount: commentCount || 0,
  };
}

export async function getUserToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at, preview_url, frame_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  const toonIds = (toons || []).map((t) => t.id);
  let commentCounts = {};
  if (toonIds.length > 0) {
    const { data: counts } = await db
      .from("comments")
      .select("animation_id")
      .in("animation_id", toonIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }

  return { toons: toons || [], commentCounts };
}

export async function getUserToonsPaginated(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/animations_feed?user_id=eq.${userId}&order=created_at.desc&limit=${perPage}&offset=${offset}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "count=exact",
      },
    }
  );
  const toons = res.ok ? await res.json() : [];
  const total = parseInt(
    res.headers?.get("Content-Range")?.split("/")[1] || "0",
    10
  );
  return { toons, total };
}

export async function getUserFavorites(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const { data: likes } = await db
    .from("likes")
    .select("animation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!likes || likes.length === 0) return { toons: [], commentCounts: {} };

  const animationIds = likes.map((l) => l.animation_id);
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at, preview_url, frame_count")
    .in("id", animationIds)
    .order("created_at", { ascending: false });

  let commentCounts = {};
  if (toons && toons.length > 0) {
    const { data: counts } = await db
      .from("comments")
      .select("animation_id")
      .in("animation_id", animationIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }

  return { toons: toons || [], commentCounts };
}

export async function getUserCommentedToons(userId, page = 1, perPage = 12) {
  const offset = (page - 1) * perPage;
  const { data: comments } = await db
    .from("comments")
    .select("animation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (!comments || comments.length === 0) return { toons: [], commentCounts: {} };

  const animationIds = [...new Set(comments.map((c) => c.animation_id))];
  const { data: toons } = await db
    .from("animations")
    .select("id, title, frames, created_at, preview_url, frame_count")
    .in("id", animationIds)
    .order("created_at", { ascending: false });

  let commentCounts = {};
  if (toons && toons.length > 0) {
    const { data: counts } = await db
      .from("comments")
      .select("animation_id")
      .in("animation_id", animationIds);
    (counts || []).forEach((c) => {
      commentCounts[c.animation_id] = (commentCounts[c.animation_id] || 0) + 1;
    });
  }

  return { toons: toons || [], commentCounts };
}

export async function updateUserAvatar(username, toonId) {
  const { error: authError } = await db.auth.updateUser({
    data: { avatar_toon: toonId },
  });
  const { error: profileError } = await db
    .from("profiles")
    .update({ avatar_toon: toonId })
    .eq("username", username);
  return {
    error: authError || profileError,
    success: !authError && !profileError,
  };
}

// ── Home page ─────────────────────────────────────────────────────────────────

export async function getPopularToons(limit = 6) {
  return supabaseRequest(
    `/animations_feed?select=*&order=likes.desc.nullslast&limit=${limit}`
  );
}

export async function getNewestToons(limit = 6) {
  return supabaseRequest(
    `/animations_feed?select=*&order=created_at.desc&limit=${limit}`
  );
}

export async function getAuthorData(userId) {
  if (!userId)
    return { username: "unknown", avatar: "/img/avatar100.gif", russian: false };
  const userData = await rpc("get_user_by_id", { p_user_id: userId });
  if (!userData || userData.length === 0)
    return { username: "unknown", avatar: "/img/avatar100.gif", russian: false };
  const user = userData[0];
  const avatarToonId = user.avatar_toon_id || user.avatar_toon || null;
  return {
    username: user.username || "unknown",
    avatar: avatarToonId
      ? `${SUPABASE_URL}/storage/v1/object/public/previews/${avatarToonId}_100.gif`
      : "/img/avatar100.gif",
    russian: user.russian || false,
    role: user.role || "user",
  };
}

/** Resolve user_id → username for a list of toons, deduped */
export async function resolveUsernames(toons) {
  const userMap = {};
  await Promise.all(
    toons.map(async (toon) => {
      if (toon.user_id && !userMap[toon.user_id]) {
        const data = await getAuthorData(toon.user_id);
        userMap[toon.user_id] = data;
      }
    })
  );
  return userMap;
}

// ── Username color data ───────────────────────────────────────────────────────

/** Fetch role/russian flag for a username (used by useUsernameColor hook) */
export async function getUserColorData(username) {
  const data = await rpc("get_user_by_username", { p_username: username });
  if (!data || data.length === 0) return { role: "user", russian: false };
  return {
    role: data[0].role || "user",
    russian: data[0].russian || false,
  };
}
