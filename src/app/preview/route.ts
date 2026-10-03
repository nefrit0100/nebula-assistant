/**
 * A blank page that renders HTML files from chat replies. The file viewer embeds it
 * in an iframe sandboxed WITHOUT allow-same-origin, so the page runs in an opaque
 * origin: it can't read Nebula's cookies, storage or DOM, and requests it makes
 * carry no session. That isolation is what lets it use a permissive CSP (set in
 * next.config.ts), so generated pages can load their CDN scripts, fonts and images.
 *
 * The parent posts the HTML once the page says it's ready; the page then replaces
 * itself with it and stops listening.
 */
const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preview</title></head>
<body><script>
(function () {
  function onMessage(event) {
    var data = event.data
    if (event.source !== window.parent || !data || data.type !== "nebula-preview-render" || typeof data.html !== "string") return
    window.removeEventListener("message", onMessage)
    document.open()
    document.write(data.html)
    document.close()
  }
  window.addEventListener("message", onMessage)
  window.parent.postMessage({ type: "nebula-preview-ready" }, "*")
})()
</script></body></html>`

export function GET() {
  return new Response(PAGE, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
