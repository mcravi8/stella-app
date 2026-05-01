import { ImageResponse } from "next/og";

/**
 * Generic favicon / Android Chrome icon. 192x192 is the canonical PWA icon
 * size. Same design as the Apple icon (see apple-icon.tsx).
 */
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 40,
        }}
      >
        <svg viewBox="0 0 64 64" width={128} height={128}>
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
