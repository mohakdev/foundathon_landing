import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  "https://foundathon.thefoundersclub.tech";

const routes: Array<{ path: string; priority?: number }> = [
  { path: "/", priority: 1.0 },
  { path: "/problem-statements", priority: 0.8 },
  { path: "/register", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map(({ path, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
