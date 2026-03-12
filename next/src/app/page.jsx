import { getPopularToons, getNewestToons, resolveUsernames } from "@/lib/api";
import ToonCard from "@/components/ToonCard";

export const metadata = {
  title: "Toonator.com - Make animation online!",
  description: "Toonator is online cartoon editing tool.",
  openGraph: {
    title: "Toonator",
    description: "Toonator is online cartoon editing tool.",
    url: "https://toonator.pages.dev",
    images: ["/img/toonator320.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toonator",
    description: "Toonator is online cartoon editing tool.",
    images: ["/img/toonator40.png"],
  },
};

export default async function HomePage() {
  const [popularToons, newestToons] = await Promise.all([
    getPopularToons(6),
    getNewestToons(6),
  ]);

  // Resolve all usernames in one pass across both lists
  const allToons = [...(popularToons || []), ...(newestToons || [])];
  const userMap = await resolveUsernames(allToons);

  return (
  <><div id="content_wrap">
      <div id="content">
        <div className="content_left">
          <b>Most popular toons</b>
          <div className="toons_container">
            <div className="toons_list">
              {!popularToons?.length ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  No toons yet.
                </div>
              ) : (
                popularToons.map((toon) => (
                  <ToonCard
                    key={toon.id}
                    toon={toon}
                    username={userMap[toon.user_id]?.username || "unknown"} />
                ))
              )}
            </div>
          </div>

          <b>Newest toons</b>
          <div className="toons_container">
            <div className="toons_list">
              {!newestToons?.length ? (
                <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                  No toons yet.
                </div>
              ) : (
                newestToons.map((toon) => (
                  <ToonCard
                    key={toon.id}
                    toon={toon}
                    username={userMap[toon.user_id]?.username || "unknown"} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="content_right">
          <br />
          {/* Logo image: swap toonator320 / multator based on lang — handled client-side via CSS or your existing images.css swap */}
          <img src="/img/toonator320.png" alt="Toonator" />
          <div>
            <span>Toonator is online cartoon editing tool.</span>
            <br />
            <span>With Toonator you can easily make funny animations.</span>
          </div>
          <h1>
            <a href="/goodplace/">Good Place</a>
          </h1>
          {/* TODO: Good Place toon — port loadGoodPlace() when ready */}
          <div id="good-place-toon" />
        </div>

        <div className="clear" />
      </div>
      <div id="footer_placeholder" />
    </div></>
  );
}
