import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { OG_IMAGE_ALT } from "@/lib/seo"

export const alt = OG_IMAGE_ALT
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpenGraphImage() {
  const mark = `data:image/png;base64,${await readFile(join(process.cwd(), "src/assets/brand/nebula-mark-512.png"), "base64")}`

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
            <img src={mark} width={64} height={64} alt="" />
            <span style={{ fontSize: 40, fontWeight: 600, color: "#13262e", letterSpacing: "-0.02em" }}>Nebula</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 68, fontWeight: 500, color: "#13262e", letterSpacing: "-0.035em", lineHeight: 1.05 }}>
              Your AI workspace.
            </span>
            <span style={{ fontSize: 68, fontWeight: 500, color: "#4f646d", letterSpacing: "-0.035em", lineHeight: 1.05 }}>
              Bring your own models.
            </span>
          </div>
          <span style={{ fontSize: 26, color: "#4f646d" }}>Free and open source</span>
        </div>
        <div style={{ display: "flex", width: 340, alignItems: "center", justifyContent: "center", background: "#dff7ff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
          <img src={mark} width={260} height={260} alt="" />
        </div>
      </div>
    ),
    size,
  )
}
