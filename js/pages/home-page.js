// Home Page Controller - Load and display popular/newest toons

import { supabaseRequest, rpc, escapeHTML } from "/js/api.js";
import { loadIncludes } from "/js/utils/includes.js";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";

// ============================================================
// Helper Functions
// ============================================================

function previewUrl(id, size = 100) {
  return `${SUPABASE_URL}/storage/v1/object/public/previews/${id}_${size}.gif`;
}

function toonCardHTML(toon, username) {
  const frames = Array.isArray(toon.frames)
    ? toon.frames
    : toon.frames
      ? Object.values(toon.frames)
      : [];
  const frameCount = frames.length;
  const frameStr =
    frameCount >= 50 ? `<b>${frameCount}</b> frames` : `${frameCount} frames`;
  const commentStr = `<span class="grayb">No comments</span>`;
  const title = escapeHTML(toon.title || "Untitled");
  const toonUrl = `/pages/toon.html?id=${toon.id}`;
  const profileUrl = `/pages/profile.html?username=${encodeURIComponent(username)}`;
  return `
      <div class="toon_preview owned">
        <div class="toon_image">
          <a href="${toonUrl}" title="${title}">
            <img alt="${title}" title="${title}" src="${previewUrl(toon.id)}">
          </a>
        </div>
        <div class="toon_name"><a class="link" href="${toonUrl}">${title}</a></div>
        <div class="toon_tagline">
          <a href="${profileUrl}" class="username foreign">${escapeHTML(username)}</a>,
          ${frameStr}
        </div>
        <div class="toon_tagline">${commentStr}</div>
      </div>`;
}

async function resolveUsernames(toons) {
  const userMap = {};
  await Promise.all(
    toons.map(async (toon) => {
      if (toon.user_id && !userMap[toon.user_id]) {
        const userData = await rpc("get_user_by_id", {
          p_user_id: toon.user_id,
        });
        userMap[toon.user_id] = userData?.[0]?.username || "unknown";
      }
    }),
  );
  return userMap;
}

async function loadPopular() {
  const toons = await supabaseRequest(
    "/animations?select=id,title,user_id,frames,likes&order=likes.desc.nullslast&limit=6",
  );
  const list = document.getElementById("popular-list");
  if (!toons || toons.length === 0) {
    list.innerHTML =
      '<div style="text-align:center;color:#888;padding:10px;">No toons yet.</div>';
    return;
  }
  const userMap = await resolveUsernames(toons);
  list.innerHTML = toons
    .map((t) => toonCardHTML(t, userMap[t.user_id] || "unknown"))
    .join("");
}

async function loadNewest() {
  const toons = await supabaseRequest(
    "/animations?select=id,title,user_id,frames,likes&order=created_at.desc&limit=6",
  );
  const list = document.getElementById("newest-list");
  if (!toons || toons.length === 0) {
    list.innerHTML =
      '<div style="text-align:center;color:#888;padding:10px;">No toons yet.</div>';
    return;
  }
  const userMap = await resolveUsernames(toons);
  list.innerHTML = toons
    .map((t) => toonCardHTML(t, userMap[t.user_id] || "unknown"))
    .join("");
}

async function loadGoodPlace() {
  // TODO: implement Good Place feature
}

// ============================================================
// Main Initialization
// ============================================================

export async function initHome() {
  await loadIncludes();
  await loadPopular();
  await loadNewest();
  await loadGoodPlace();
}
