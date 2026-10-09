# Third-party notices

Nebula Assistant is released under the [MIT License](./LICENSE). It ships the third-party fonts, icons and code below to the browser. Every npm dependency keeps its own license file in `node_modules/<package>/`; run `npx license-checker --production --summary` for a complete list.

## Fonts

| Font | Used for | License | Source |
| --- | --- | --- | --- |
| Instrument Sans | Interface text | SIL Open Font License 1.1 | [Instrument/instrument-sans](https://github.com/Instrument/instrument-sans) |
| JetBrains Mono | Code | SIL Open Font License 1.1 | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) |
| KaTeX fonts | Math | MIT License (part of KaTeX) | [KaTeX/KaTeX](https://github.com/KaTeX/KaTeX) |

Instrument Sans and JetBrains Mono are downloaded by `next/font` at build time and served from the deployment's own origin; visitors' browsers never contact Google Fonts. The SIL Open Font License allows embedding and redistribution; the fonts may not be sold on their own. License text: <https://openfontlicense.org/open-font-license-official-text/>.

## Icons and images

| Asset | License |
| --- | --- |
| Interface icons ([Lucide](https://lucide.dev), `lucide-react`) | ISC License, © Lucide Icons and Contributors |
| Nebula planet mark, app icons and favicon (`src/assets/brand`, `public/brand`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`) | Part of this project, MIT License |
| Sign-in page artwork (`public/auth/right-side.webp`) | Created for this project, MIT License |
| Google "G" logo (`src/components/auth/google-icon.tsx`) | Trademark of Google LLC, used only on the "Continue with Google" button as permitted by [Google's sign-in branding guidelines](https://developers.google.com/identity/branding-guidelines) |

## Libraries bundled for the browser

| Package | License |
| --- | --- |
| next, react, react-dom | MIT |
| @radix-ui/* | MIT |
| @supabase/ssr, @supabase/supabase-js | MIT |
| cmdk, sonner, clsx, tailwind-merge | MIT |
| react-markdown, remark-gfm, remark-math, rehype-katex | MIT |
| katex | MIT |
| shiki | MIT |
| lucide-react | ISC |
| zod | MIT |
