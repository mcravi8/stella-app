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
            d="M32 6L39 23L57 24L43 35L47 53L32 43L17 53L21 35L7 24L25 23Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    size
  );
}
