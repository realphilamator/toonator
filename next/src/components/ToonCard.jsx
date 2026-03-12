"use client";
import Link from "next/link";
import UsernameLink from "./UsernameLink";

/**
 * Shared toon card used on homepage and profile page.
 * Pass `username` to show the author line (homepage).
 * Pass `commentCount` to show comment count.
 */
export default function ToonCard({ toon, username, commentCount = 0 }) {
  const frameCount = toon.frame_count ?? 0;
  const title = toon.title || "Untitled";

  const frameLabel =
    frameCount >= 50 ? (
      <><b>{frameCount}</b> frames</>
    ) : (
      `${frameCount} frames`
    );

  const commentLabel =
    commentCount === 0 ? (
      <span className="grayb">No comments</span>
    ) : (
      <><b>{commentCount}</b> comment{commentCount === 1 ? "" : "s"}</>
    );

  return (
    <div className="toon_preview">
      <div className="toon_image">
        <Link href={`/toon/${toon.id}`} title={title}>
          <img
            src={toon.preview_url}
            width={200}
            height={100}
            alt={title}
            onError={(e) => { e.currentTarget.src = "/img/avatar100.gif"; }}
          />
        </Link>
      </div>

      <div className="toon_name">
        <Link className="link" href={`/toon/${toon.id}`}>{title}</Link>
      </div>

      {username ? (
        <div className="toon_tagline">
          <UsernameLink username={username} />, {frameLabel}
        </div>
      ) : (
        <div className="toon_tagline">{frameLabel}</div>
      )}

      <div className="toon_tagline">{commentLabel}</div>
    </div>
  );
}
