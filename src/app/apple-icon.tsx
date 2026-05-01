import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon. iOS auto-rounds the corners but we still draw a
 * rounded background so the contained S has a clean inset, matching the
 * in-app brand mark in SwipePageClient.tsx.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0969da",
          borderRadius: 36,
        }}
      >
        <svg viewBox="0 0 64 64" width={120} height={120}>
          <path
            d="M20 18h16c4 0 8 3 8 7s-4 7-8 7H28c-2 0-4 1-4 3s2 3 4 3h16v8H28c-4 0-8-3-8-7s4-7 8-7h8c2 0 4-1 4-3s-2-3-4-3H20v-8z"
            fill="white"
          />
        </svg>
      </div>
    ),
    size
  );
}
