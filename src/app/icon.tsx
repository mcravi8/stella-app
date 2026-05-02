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
            d="M32 6L39 23L57 24L43 35L47 53L32 43L17 53L21 35L7 24L25 23Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    size
  );
}
