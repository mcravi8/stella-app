import type { MetadataRoute } from "next";

/**
 * Web App Manifest. Lets browsers (Chrome/Edge on Android, others) treat the
 * site as an installable PWA — fullscreen launch from the home screen with
 * the app icon and theme colour. iOS Safari uses the apple-* meta tags from
 * layout.tsx; Android uses this manifest. Both are needed for parity.
 *
 * Next.js serves this file at /manifest.webmanifest and the metadata.manifest
 * link in layout.tsx points to that path.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stella — Swipe, Star, Build",
    short_name: "Stella",
    description: "Swipe, star, build — discover your next GitHub project.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8fa",
    theme_color: "#0969da",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
