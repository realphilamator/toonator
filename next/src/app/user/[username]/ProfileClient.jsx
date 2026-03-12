"use client";
import { useState, useEffect, useCallback } from "react";
import ToonCard from "@/components/ToonCard";
import UsernameLink from "@/components/UsernameLink";
import Paginator, { calculateTotalPages } from "@/components/paginator";
import { useAuth } from "@/hooks/auth";
import {
  getUserToonsPaginated,
  getUserFavorites,
  getUserCommentedToons,
  updateUserAvatar,
} from "@/lib/api";
import { SUPABASE_URL } from "@/lib/config";

const TABS = [
  { key: "album",     label: "Album" },
  { key: "favorites", label: "Favorites" },
  { key: "comments",  label: "Comments" },
];
const PER_PAGE = 12;

export default function ProfileClient({ username, profile, stats, initialPage = 1 }) {
  const { user } = useAuth();
  const [currentTab, setCurrentTab]   = useState("album");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [toons, setToons]             = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [avatarSrc, setAvatarSrc]     = useState("/img/avatar100.gif");

  const isOwnProfile = user?.user_metadata?.username === username;

  // ── Avatar ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const avatarToon = isOwnProfile
      ? user?.user_metadata?.avatar_toon || profile.avatar_toon
      : profile.avatar_toon;
    if (avatarToon) {
      setAvatarSrc(
        `${SUPABASE_URL}/storage/v1/object/public/previews/${avatarToon}_100.gif`
      );
    }
  }, [profile, user, isOwnProfile]);

  // ── Load tab data ────────────────────────────────────────────────────────────
  const loadTab = useCallback(
    async (tab, page) => {
      setLoading(true);
      try {
        let result;
        if (tab === "album") {
          result = await getUserToonsPaginated(profile.id, page, PER_PAGE);
          setTotalPages(calculateTotalPages(result.total, PER_PAGE));
          setCommentCounts({});
        } else if (tab === "favorites") {
          result = await getUserFavorites(profile.id, page, PER_PAGE);
          setTotalPages(1);
          setCommentCounts(result.commentCounts || {});
        } else {
          result = await getUserCommentedToons(profile.id, page, PER_PAGE);
          setTotalPages(1);
          setCommentCounts(result.commentCounts || {});
        }
        setToons(result.toons || []);
      } finally {
        setLoading(false);
      }
    },
    [profile.id]
  );

  useEffect(() => {
    loadTab(currentTab, currentPage);
  }, [currentTab, currentPage, loadTab]);

  function switchTab(tab) {
    setCurrentTab(tab);
    setCurrentPage(1);
  }

  // ── Change avatar ────────────────────────────────────────────────────────────
  async function handleChangeAvatar() {
    const toonId = prompt("Enter toon ID to use as avatar:");
    if (!toonId) return;
    const { success, error } = await updateUserAvatar(username, toonId);
    if (success) {
      setAvatarSrc(
        `${SUPABASE_URL}/storage/v1/object/public/previews/${toonId}_100.gif`
      );
    } else {
      alert("Error saving avatar: " + (error?.message || "Unknown error"));
    }
  }

  return (
    <div id="content_wrap">
      <div id="content">
        <div className="userprofile">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="content_right">
            <div className="center">
              <h3 id="profile_username_wrap">
                <UsernameLink username={username} />
              </h3>
              <div className="center">
                <img
                  src={avatarSrc}
                  className="p200"
                  alt={`${username}'s avatar`}
                  onError={(e) => { e.currentTarget.src = "/img/avatar100.gif"; }}
                />
              </div>
              {isOwnProfile && (
                <div>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleChangeAvatar(); }}
                    style={{ fontSize: "9pt" }}
                  >
                    [Change avatar]
                  </a>
                </div>
              )}
            </div>

            <span>Total toons:</span>{" "}
            <span id="stat_toons">{stats.totalToons}</span>
            <br />

            {isOwnProfile && (
              <>
                <span>Total drafts:</span>{" "}
                <span>{stats.draftCount}</span>
                <br />
              </>
            )}

            <span>Total comments:</span>{" "}
            <span>{stats.commentCount}</span>
            <br />
            <br />

            <span>Rank:</span> <b>Passer</b>
            <br />
            <br />

            {user && !isOwnProfile && (
              <a
                href={`/messages?username=${encodeURIComponent(username)}`}
                style={{ fontSize: "10pt" }}
              >
                Private messages
              </a>
            )}
          </div>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <div className="content_left">
            <h1>
              <span style={{ fontWeight: "normal" }}>
                {TABS.map((tab, i) => (
                  <span key={tab.key}>
                    <a
                      href="#"
                      className={`nmenu${currentTab === tab.key ? " selected" : ""}`}
                      onClick={(e) => { e.preventDefault(); switchTab(tab.key); }}
                    >
                      {tab.label}
                    </a>
                    {i < TABS.length - 1 && " | "}
                  </span>
                ))}
              </span>
            </h1>

            <Paginator
              totalPages={totalPages}
              username={username}
              currentPage={currentPage}
            />

            <div className="toons_container">
              <div className="toons_list">
                {loading ? (
                  <p style={{ color: "#888888", fontSize: "10pt", padding: "10px 0" }}>
                    Loading...
                  </p>
                ) : toons.length === 0 ? (
                  <p style={{ color: "#888888", fontSize: "10pt", padding: "10px 0" }}>
                    {currentTab === "favorites"
                      ? "No favorites yet."
                      : currentTab === "comments"
                      ? "No commented toons yet."
                      : "No toons yet."}
                  </p>
                ) : (
                  toons.map((toon) => (
                    <ToonCard
                      key={toon.id}
                      toon={toon}
                      commentCount={commentCounts[toon.id] || 0}
                    />
                  ))
                )}
              </div>
            </div>

            <Paginator
              totalPages={totalPages}
              username={username}
              currentPage={currentPage}
            />
          </div>
        </div>

        <div style={{ clear: "both" }} />
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}
