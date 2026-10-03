import { ImageResponse } from "next/og"

export const alt = "Nebula Assistant — Your AI workspace. Bring your own models."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="56" height="56" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="#13262e" />
              <circle cx="21.5" cy="10.5" r="8" fill="#dff7ff" />
              <circle cx="21.5" cy="10.5" r="2.4" fill="#13262e" />
            </svg>
            <span style={{ fontSize: 40, fontWeight: 600, color: "#13262e", letterSpacing: "-0.02em" }}>Nebula</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 76, fontWeight: 500, color: "#13262e", letterSpacing: "-0.035em", lineHeight: 1.05 }}>
              Your AI workspace.
            </span>
            <span style={{ fontSize: 76, fontWeight: 500, color: "#4f646d", letterSpacing: "-0.035em", lineHeight: 1.05 }}>
              Bring your own models.
            </span>
          </div>
          <span style={{ fontSize: 26, color: "#4f646d" }}>Free and open source</span>
        </div>
        <div style={{ display: "flex", width: 300, background: "#dff7ff" }} />
      </div>
    ),
    size,
  )
}
