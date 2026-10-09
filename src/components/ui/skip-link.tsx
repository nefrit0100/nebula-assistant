/** First focusable element on a page: lets keyboard users jump past the header and navigation to `#main`. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-md bg-fg px-3 py-2 text-fg-inverse focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
    >
      Skip to content
    </a>
  )
}
