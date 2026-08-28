# Editorial Article Template

Reusable page template for Petersen's Hunting editorial article detail pages
(e.g. `/editorial/<slug>/<id>` on the source site → `/petersen-hunting/editorial/<slug>` on DA).

**Built reference (finished example):**
`content/petersen-hunting/editorial/ammovault-ammunition-reserve.plain.html`

**Live example:**
https://main--osg--srm0233-adobe.aem.live/petersen-hunting/editorial/ammovault-ammunition-reserve

---

## Section order (4 sections)

1. **Leaderboard Advertisement** — `spotlight` block, full-width grey banner below the
   search bar. Rotates through creatives (one authored cell per creative). House-ad
   creatives live in DA under `images/promos/` (leaderboard) — reference by absolute
   published URL on nested pages.
2. **Article Body + Rail** — section `Style: has-rail`.
   - Left column (default content): H1 headline, grey italic **deck** (the `h1 + h2`),
     hero image + `_italic caption_`, `date + byline` line, long-form body with `###`
     subheads and inline `figure` images each followed by an italic caption paragraph.
   - Right column: `rail` block — a sticky sidebar with a rotating **vertical ad**
     (creatives from DA `images/advertisement/vertical/`, one authored cell each) followed
     by a **Subscribe & Save** promo (magazine cover + heading + Subscribe Now button).
   - Body + rail align to the header/nav content band (`--content-max-width`, 300px rail).
3. **Author Bio** — section `Style: author-bio`. Circular author avatar + name (h2) + bio
   paragraph + "See more articles" link, aligned to the article's main column.
4. **Recent Videos** — `cards-video` block (the same block used on the homepage), a
   "Recent Videos" h2 followed by a grid of video cards (thumbnail link, category tag, title).

## Metadata block

Each page ends with a `metadata` table (Title, Description, Image, og:title). EDS strips it
from the rendered body and emits it as `<head>` tags — used by index/fragments for the
page's primary items. Keep it on every article.

## Blocks used (all already in `blocks/`, deployed)
- `spotlight` — rotating banner ad
- `rail` — sticky sidebar (ad rotation + promo)
- `cards-video` — recent-videos grid
- Section styles `has-rail` and `author-bio` live in `styles/styles.css`.

## How to migrate the next editorial page (per page)

1. Obtain the source article HTML (firewalled site → paste it in, saved to
   `migration-work/<slug>.html`); serve locally with scripts stripped (port 8899).
2. Reuse this template — no re-analysis needed. Build the `.plain.html` with the 4
   sections above:
   - Section 1: `spotlight` with the leaderboard creative(s).
   - Section 2 (`has-rail`): the article's H1/deck/hero/byline/body/figures in the
     default-content wrapper, and a `rail` block (vertical ad creatives + Subscribe promo)
     as the first child so it floats into the right column.
   - Section 3 (`author-bio`): author photo, name, bio, "See more" link.
   - Section 4: the `cards-video` grid (copy from `content/home-local.plain.html` or refresh
     with the latest recent videos).
   - Trailing `metadata` table (Title/Description/Image/og:title) for the new article.
   - Use **absolute** published image URLs for shared house assets (promos, vertical ads,
     magazine cover) since the page lives at a nested path.
3. Wrap for DA (`<body><header></header><main>…</main><footer></footer></body>`), POST to
   the DA Source API at `petersen-hunting/editorial/<slug>.html`, then preview + publish
   via admin.hlx.page.

## Target path
`/petersen-hunting/editorial/<slug>`
