import { ImageResponse } from "next/og";
import { LevelBars } from "@/lib/mark-art";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          paddingBottom: 2,
        }}
      >
        <LevelBars barWidth={4} gap={2} maxHeight={26} />
      </div>
    ),
    { ...size },
  );
}
