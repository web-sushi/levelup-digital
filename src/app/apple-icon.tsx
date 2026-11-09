import { ImageResponse } from "next/og";
import { LevelBars } from "@/lib/mark-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#050505",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 22,
        }}
      >
        <LevelBars barWidth={16} gap={8} maxHeight={132} />
      </div>
    ),
    { ...size },
  );
}
