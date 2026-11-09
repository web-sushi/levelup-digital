import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LevelBars } from "@/lib/mark-art";

export const runtime = "nodejs";

export async function GET() {
  const font = await readFile(join(process.cwd(), "src/assets/fonts/SpaceGrotesk-Medium.ttf"));

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#050505",
          color: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          fontFamily: "Space Grotesk",
        }}
      >
        <LevelBars barWidth={18} gap={10} maxHeight={112} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1, letterSpacing: -2 }}>
            LevelUp Digital
          </div>
          <div style={{ width: 88, height: 6, background: "#00F050", marginTop: 28 }} />
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.2, color: "#d4d4d4", marginTop: 24 }}>
            Websites and custom digital products.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 1, color: "#a3a3a3" }}>
          levelup-digital.dev
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Space Grotesk",
          data: font,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
  image.headers.set("Cache-Control", "public, max-age=86400");
  return image;
}
