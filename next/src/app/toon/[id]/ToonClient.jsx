"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ytyhhmwnnlkhhpvsurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0eWhobXdubmxraGhwdnN1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzcwNTAsImV4cCI6MjA4ODU1MzA1MH0.XZVH3j6xftSRULfhdttdq6JGIUSgHHJt9i-vXnALjH0";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isLegacyId(id) {
  return /^[a-zA-Z0-9]{3,16}$/.test(id);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US") + " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ─── Toon Player (modern HTML5 — delegates to /js/toon-player.js) ────────────
function ToonPlayer({ frames, settings }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!frames || frames.length === 0) return;

    function mountPlayer() {
      if (!window.initToonPlayer) { setTimeout(mountPlayer, 50); return; }
      if (!containerRef.current) return;

      // Give the container a stable id for initToonPlayer
      const id = "toon-player-" + Math.random().toString(36).slice(2);
      containerRef.current.id = id;

      // Destroy any previous instance before re-mounting
      playerRef.current?.destroy?.();
      playerRef.current = window.initToonPlayer(id, frames, settings || {});
    }

    if (window.initToonPlayer) {
      mountPlayer();
    } else {
      // Load the script once if it isn't already present
      if (!document.querySelector('script[src="/js/toon-player.js"]')) {
        const script = document.createElement("script");
        script.src = "/js/toon-player.js";
        script.onload = mountPlayer;
        document.head.appendChild(script);
      } else {
        mountPlayer();
      }
    }

    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [frames, settings]);

  return <div ref={containerRef} style={{ lineHeight: 0 }} />;
}

// ─── Legacy Ruffle Player ────────────────────────────────────────────────────
function LegacyPlayer({ toonId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    function initRuffle() {
      if (!window.RufflePlayer) { setTimeout(initRuffle, 100); return; }
      const ruffle = window.RufflePlayer.newest();
      const player = ruffle.createPlayer();
      player.style.width = "610px";
      player.style.height = "350px";
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(player);
      player.load({
        url: "/swf/player28en.swf",
        parameters: { toonId },
        allowScriptAccess: false,
        backgroundColor: "#FFFFFF",
      });
    }

    // Load Ruffle script dynamically
    const script = document.createElement("script");
    script.src = "/js/ruffle/ruffle.js";
    script.onload = initRuffle;
    document.head.appendChild(script);

    return () => {
      script.remove();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [toonId]);

  return <div ref={containerRef} style={{ width: "610px", height: "350px" }} />;
}

// ─── Comment ─────────────────────────────────────────────────────────────────
function Comment({ comment }) {
  const username = comment.author_username || "anonymous";
  const dateStr = formatDate(comment.created_at);
  return (
    <div className="comment">
      <div className="avatar">
        <a href={`/user/${encodeURIComponent(username)}`}>
          <img className="avatar" src={comment.avatar || "/img/avatar100.gif"}
            onError={e => { e.target.src = "/img/avatar100.gif"; }} />
        </a>
      </div>
      <div className="head">
        <a href={`/user/${encodeURIComponent(username)}`} className="username">{username}</a>
        <span className="date"><b>{dateStr}</b></span>
      </div>
      <div className="text">{comment.text}</div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function ToonClient({ toonId, toon, author, continuedFrom, initialComments, initialLikeCount, isLegacy }) {
  const [comments, setComments] = useState(initialComments);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const frames = toon.frames
    ? (Array.isArray(toon.frames) ? toon.frames : Object.values(toon.frames))
    : [];
  const toonSettings = toon.settings || {};

  const previewUrl = isLegacy
    ? `${SUPABASE_URL}/storage/v1/object/public/legacyAnimations/${toonId}_100.gif`
    : `${SUPABASE_URL}/storage/v1/object/public/previews/${toonId}_100.gif`;

  const continueUrl = isLegacy ? `/draw/classic/?cont=${toonId}` : `/draw/?continue=${toonId}`;

  useEffect(() => {
    db.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        const col = isLegacy ? "legacy_animation_id" : "animation_id";
        db.from("likes").select("id").eq(col, toonId).eq("user_id", user.id).maybeSingle()
          .then(({ data }) => { if (data) setLiked(true); });
      }
    });
  }, [toonId, isLegacy]);

  async function handleLike(e) {
    e.preventDefault();
    if (!currentUser) { window.showAuth?.("login"); return; }

    const col = isLegacy ? "legacy_animation_id" : "animation_id";
    const table = isLegacy ? "legacy_animations" : "animations";

    if (liked) {
      await db.from("likes").delete().eq(col, toonId).eq("user_id", currentUser.id);
      const { data: t } = await db.from(table).select("likes").eq("id", toonId).single();
      await db.from(table).update({ likes: Math.max(0, (t?.likes || 0) - 1) }).eq("id", toonId);
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
    } else {
      await db.from("likes").upsert(
        { [col]: toonId, user_id: currentUser.id },
        { onConflict: `${col},user_id`, ignoreDuplicates: true }
      );
      const { data: t } = await db.from(table).select("likes").eq("id", toonId).single();
      await db.from(table).update({ likes: (t?.likes || 0) + 1 }).eq("id", toonId);
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!currentUser) { window.showAuth?.("login"); return; }
    setShowCommentForm(true);
  }

  async function postComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    if (text.length > 250) {
      setCommentError("Comment must be 250 characters or less.");
      return;
    }

    setPostingComment(true);
    setCommentError("");

    const username = currentUser.user_metadata?.username || currentUser.email;
    const col = isLegacy ? "legacy_animation_id" : "animation_id";

    const { data, error } = await db.from("comments").insert({
      [col]: toonId,
      user_id: currentUser.id,
      author_username: username,
      text,
    }).select().single();

    if (error) {
      setCommentError("Error posting comment: " + error.message);
      setPostingComment(false);
      return;
    }

    // Get avatar for new comment
    const { data: profile } = await db.rpc("get_user_by_username", { p_username: username });
    const avatarToonId = profile?.[0]?.avatar_toon_id || profile?.[0]?.avatar_toon || null;
    const avatar = avatarToonId
      ? `${SUPABASE_URL}/storage/v1/object/public/previews/${avatarToonId}_100.gif`
      : "/img/avatar100.gif";

    setComments(prev => [{ ...data, avatar }, ...prev]);
    setCommentText("");
    setShowCommentForm(false);
    setPostingComment(false);
  }

  const title = toon.title || "Untitled";
  const description = toon.description || "";
  const keywords = toon.keywords || "";
  const tags = keywords.split(",").map(k => k.trim()).filter(Boolean);

  return (
    <div id="content_wrap">
      <div id="content">
        <div id="toon_page">

          {/* LEFT PANEL */}
          <div className="left_panel">
            <h2>{title}</h2>
            <div className="player" id="player_container">
              {isLegacy
                ? <LegacyPlayer toonId={toonId} />
                : <ToonPlayer frames={frames} settings={toonSettings} />
              }
            </div>

            {/* Comments */}
            <div className="toon_comments" id="comments">
              <span className="header">
                <span style={{ float: "left" }}>Comments</span>
                <a href="#" className="new" onClick={handleAddComment}>Add comment</a>
                <div style={{ clear: "both" }} />
              </span>

              {showCommentForm && (
                <div id="comments_form">
                  <div className="form2">
                    <textarea
                      id="comment_text"
                      rows={3}
                      placeholder="Write a comment..."
                      maxLength={250}
                      value={commentText}
                      onChange={e => {
                        setCommentText(e.target.value);
                        setCommentError("");
                      }}
                      style={{ border: "1px solid #cccccc", margin: "10px", width: "580px", fontFamily: "Arial", fontSize: "10pt" }}
                    />
                    <div style={{ fontSize: "9pt", color: commentText.length > 240 ? "#c00" : "#888", marginLeft: "10px" }}>
                      {commentText.length}/250
                    </div>
                  </div>
                  {commentError && (
                    <div style={{ color: "red", fontSize: "9pt", margin: "0 10px 6px" }}>{commentError}</div>
                  )}
                  <div className="form2" style={{ textAlign: "right", marginRight: "10px", marginBottom: "10px" }}>
                    <button onClick={postComment} disabled={postingComment}>
                      {postingComment ? "Posting..." : "Post"}
                    </button>
                    <button onClick={() => { setShowCommentForm(false); setCommentText(""); setCommentError(""); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div id="comments_list">
                {comments.length === 0
                  ? <p style={{ color: "#888888", fontSize: "10pt", padding: "10px" }}>No comments yet.</p>
                  : comments.map(c => <Comment key={c.id} comment={c} />)
                }
              </div>
            </div>
          </div>
          {/* END LEFT PANEL */}

          {/* RIGHT PANEL */}
          <div className="info">
            <div className="author">
              <img
                className="avatar"
                id="author_avatar"
                src={author.avatar}
                onError={e => { e.target.src = "/img/avatar100.gif"; }}
              />
              <div className="author_name">
                <a href={`/user/${encodeURIComponent(author.username)}`} className="username">
                  {author.username}
                </a>
              </div>
              <div className="date" id="toon_date">{formatDate(toon.created_at)}</div>
            </div>

            <div className="prizes" />
            <div className="buttons">
              <div className="toonmedals" />
              <div className="like hover">
                <a href="#" onClick={handleLike} className={`hover${liked ? " active" : ""}`} id="like_link">
                  <img src="/img/1.gif" className="img_like" />
                  <span className="black" id="like_value">{likeCount}</span>
                  <span>Like</span>
                </a>
              </div>
              <div className="favorites">
                <a href="#" className="hover" id="favlink" onClick={e => { e.preventDefault(); alert("Favorites coming soon!"); }}>
                  <img src="/img/1.gif" className="img_favorites" /><span>Favorites</span>
                </a>
              </div>
              <div className="draw">
                <a href={continueUrl} className="hover">
                  <img src="/img/1.gif" className="img_pencil" /><span>Continue</span>
                </a>
              </div>
            </div>

            <div className="line_7"><img src="/img/1.gif" /></div>

            {description && (
              <div className="description" id="description_div">
                <span id="description_text">{description}</span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="tags" id="tags_container" style={{ margin: "5px 0" }}>
                {tags.map(tag => (
                  <a key={tag} href="#" className="tag">{tag}</a>
                ))}
              </div>
            )}

            <div className="share">
              <ul className="share">
                <li>Share:</li>
                <li>
                  <a rel="nofollow" title="Twitter"
                    href={`https://twitter.com/intent/tweet?url=https://toonator.site/toon/${toonId}&text=${encodeURIComponent(title)}`}
                    target="_blank">
                    <div className="shr_tw" />
                  </a>
                </li>
                <li>
                  <a rel="nofollow" title="Reddit"
                    href={`https://reddit.com/submit?url=https://toonator.site/toon/${toonId}&title=${encodeURIComponent(title)}`}
                    target="_blank">
                    <div className="shr_reddit" />
                  </a>
                </li>
              </ul>
            </div>

            {continuedFrom && (
              <div className="tcontinues" id="continued_from">
                <h4>Original</h4>
                <div className="line_1"><img src="/img/1.gif" /></div>
                <ul className="continues_list">
                  <li>
                    <a href={`/toon/${continuedFrom.id}`}>
                      <img className="p100"
                        src={continuedFrom.legacy
                          ? `${SUPABASE_URL}/storage/v1/object/public/legacyAnimations/${continuedFrom.id}_100.gif`
                          : `${SUPABASE_URL}/storage/v1/object/public/previews/${continuedFrom.id}_100.gif`
                        }
                        onError={e => { e.target.src = "/img/avatar100.gif"; }}
                      />
                      <div className="name">{continuedFrom.title}</div>
                    </a>
                    <div className="cauthor">
                      <a href={`/user/${encodeURIComponent(continuedFrom.author)}`} className="username">
                        {continuedFrom.author}
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>
          {/* END RIGHT PANEL */}

          <div style={{ clear: "both" }} />
        </div>
      </div>
      <div id="footer_placeholder" />
    </div>
  );
}