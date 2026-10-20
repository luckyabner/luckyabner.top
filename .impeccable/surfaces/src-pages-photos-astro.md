---
version: 1
slug: "src-pages-photos-astro"
primary_target: "src/pages/photos.astro"
related_targets: ["src/scripts/photos.ts", "src/lib/photos.ts", "src/components/Header.astro", "src/layouts/Layout.astro"]
---

# Photos — 2026-10-20

Mode: Experience. Extend the established DESIGN.md world with the user's approved antfu-inspired square photo grid. No new visual identity or replacement of global design tokens.

THESIS: Let the photographs lead. A quiet heading and one Full frame toggle precede a responsive, unboxed grid. The gallery expands to 90rem while the shared header and footer retain their reading width.

FIRST VIEWPORT: Existing signature, Blog / Projects / Photos / theme navigation. Warm paper or charcoal, Maple Mono, a Photos heading, and square image cells separated by 12–16px. One column on phones, two at 40rem, three at 60rem, four at 80rem. No cards, shadows, decorative rules, filters, or invented photo content. With no supplied photographs, ship an honest empty state.

INTERACTION: Default cover; Full frame switches to contain inside the same cells and persists locally. PhotoSwipe opens uncropped responsive images, supports touch/keyboard/zoom, and restores focus. Core loads on intent; the static image link remains usable without JS. Account for ClientRouter initialization and cleanup, unavailable storage, failed images and reduced motion.

INTERACTION FOLLOW-UP — 2026-10-20: Full frame now shows an explicit filled checkmark synchronized with its pressed state in both themes. PhotoSwipe bypasses development pre-bundling, awaits its lazy core before opening, and follows the large-image link if that download fails. The bottom caption displays available focal length / equivalent, aperture, shutter, ISO, camera and lens; absent metadata is omitted and changes with the slide. Mobile text wraps in the reserved bottom area. Only selected camera metadata is retained in large files; thumbnails remain metadata-free.

DELIVERY: Original exports and temporary conversion files stay under gitignored .photos-local/. Only compressed WebP variants and generated catalog enter deployment. No source deletion, remote photo API, frontend framework hydration, or automatic pruning. See README.md for the author workflow.

FOLLOW-UP — 2026-10-20: The user requested only two outputs per photograph: one 960px-wide thumbnail and one 2560px maximum-edge large image. Generated names now lead with EXIF camera date/time, followed by a stable sequence and a short content fingerprint. Superseded catalog-owned images move into recoverable local backups after the new catalog is saved. The visible gallery design and interactions remain the same; the earlier performance measurements describe the original three-thumbnail implementation.

QUALITY BAR: Match the site's typography, neutral tokens, visible focus, 44px controls, and both themes. Preserve image grid geometry on load and view change. Verify responsive composition, direct/client navigation, repeat imports, failed re-exports, archived originals, and builds without source exports. Synthetic fixtures are verification-only and never shipped as the user's photographs.

CONTROL REFINEMENT — 2026-10-20: Keep the geometric viewfinder but follow the user's correction to match the site's borderless style: no capsule, border, or background in either state. The inner image changes from square to landscape; stronger ink and medium-weight text distinguish the pressed state. Hover underlines the label. Preserve the Full frame label, 44px target, visible keyboard focus, local preference, and reduced-motion support.

INITIAL COMPLETION — 2026-10-20: Compared the finished Photos page, client script, photo helpers, Header, Layout, and global stylesheet with DESIGN.md, PRODUCT.md, and .impeccable/design.json; inspected the desktop, mobile, mobile-dark, lightbox, and empty-mobile review captures. The extension retains the warm neutral themes, self-hosted Maple Mono, flat unboxed geometry, 44px controls, and visible focus. The 90rem grid, Photos navigation entry, page-heading scale, and dark image viewer remain surface-specific choices; root system files are preserved. Legacy detector ramp discrepancies are advisory and remain untouched rather than becoming new system rules. README.md contains the author workflow. At initial completion the catalog was empty; initial screenshot photographs were temporary fixtures. The user subsequently supplied seven real photographs.

VERIFICATION: Independent finish review returned ship with no material fixes. The implementation run reports eight passing import tests, lint, TypeScript, photo validation, both normal and source-less production builds, and browser checks for responsive layout, both themes, stable cover/contain geometry, viewer keyboard/focus behavior, ClientRouter navigation, and failed-image fallback. Field performance and physical iOS touch remain untested; the general image check still reports 41 existing blog alt-text issues.

FOLLOW-UP VERIFICATION: Twelve import tests pass, including retained camera settings, stripped location/serial fields, and WebP EXIF extraction. Development and production viewers open correctly; keyboard navigation updates metadata, close restores focus, and Blog → Photos preserves the window and preference. Core-download failure falls back to the native image document. Desktop and mobile lightbox plus light/dark checkmarks were inspected. Full production build, lint, type check and photo validation pass. See docs/photos-verification.md for the current evidence and historical performance limits.
