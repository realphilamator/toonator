import Link from "next/link";

export function calculateTotalPages(totalItems, itemsPerPage = 12) {
  return Math.ceil(totalItems / itemsPerPage);
}

/**
 * React port of renderPaginator() from paginator.js.
 * Renders page links for /user/[username]/?page=N
 */
export default function Paginator({ totalPages, username, currentPage = 1 }) {
  if (!totalPages || totalPages <= 1) return null;

  const maxShow = 5;
  const shown = Math.min(totalPages, maxShow);

  return (
    <div className="paginator">
      <ul className="paginator">
        {Array.from({ length: shown }, (_, i) => i + 1).map((page) => (
          <li key={page} className={page === currentPage ? "current" : ""}>
            <Link href={`/user/${encodeURIComponent(username)}/?page=${page}`}>
              {page}
            </Link>
          </li>
        ))}
        {totalPages > maxShow && <li className="dots">...</li>}
      </ul>
      <div style={{ clear: "both" }} />
    </div>
  );
}
