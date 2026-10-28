# Design assets

Shared by every app. Delete anything that stops being referenced.

| File                            | Used by                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `fonts/Satoshi-Variable*.woff2` | `@font-face` rules in `../styles/globals.css` (every app). One variable file covers weights 300–900; `.woff` / `.ttf` are fallbacks. |
| `fonts/static/Satoshi-*.ttf`    | `opengraph-image.tsx` in each app (the OG renderer needs static weights). |

App images stay in that app's `public/images` (landing: hero and section art; web: empty states, asset icons),
because `next/image` and CSS backgrounds need a plain URL. Logos go in each app's `public/images` once the
design guide lands; until then `Logo` renders a text wordmark.
