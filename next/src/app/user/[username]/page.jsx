import { getProfileByUsername, getProfileStats } from "@/lib/api";
import { notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";

export async function generateMetadata({ params }) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return { title: `${decoded} - Toonator` };
}

export default async function UserPage({ params, searchParams }) {
  const { username: rawUsername } = await params;
  const { page: pageParam } = await searchParams;
  const username = decodeURIComponent(rawUsername);
  const initialPage = Math.max(1, parseInt(pageParam || "1", 10));

  const { profile, error } = await getProfileByUsername(username);
  if (!profile) notFound();

  const stats = await getProfileStats(profile.id);

  return (
    <ProfileClient
      username={username}
      profile={profile}
      stats={stats}
      initialPage={initialPage}
    />
  );
}
