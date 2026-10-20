---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/blog/index.astro","src/pages/zh/blog/index.astro","src/pages/projects.astro","src/layouts/BlogPost.astro","src/styles/global.css"]
---

# Minimal redesign — 2026-10-20

Scope: homepage, blog indexes, project index, article shell, shared navigation/footer. Mode: Read, with a personal introduction.

The user delegated direction selection to the main agent. This session uses code-led implementation because the designated implementer is pi's DeepSeek Flash; no standing build-path preference is inferred.

## Direction contract

THESIS: A quiet personal book page. Hierarchy comes from proximity, text scale, and breathing room. Repeated horizontal rules, ornamental numbering, and table-like rows leave the interface.

OWN-WORLD: Warm off-white and charcoal, existing signature and avatar, restrained system typography selected for bilingual legibility and zero font loading. Unboxed text entries; no card wall, shadow, gradient, or new illustration.

STORY: Meet Abner, scan recent writing, explore a project, and read without interruption. Existing copy, URLs, bilingual navigation, code controls, and themes remain functional.

FIRST VIEWPORT: A roughly 720px centered column, small signature and quiet top navigation. Intro uses an 80px avatar alongside a 32–36px greeting. Latest writing starts after a distinct but compact pause, with natural-case section title and aligned All posts link. Article titles precede subdued metadata, with no numbering or trailing arrows. Projects use two open columns on wide screens, one on mobile. Signature interaction is a subtle text underline/color change on hover or focus, without shifting text.

FORM: Quiet personal book page; user-pinned simplicity overrides exploratory seed 65f59bde. The exploratory alternatives were unsuitable for this brief's direct reading task: emissive queue, film rail, glass timetable, consumer cards, ocean descent, and folded shell. Retained disciplines: consistent emphasis, clear current location, aligned metadata, comfortable touch targets, continuous reading, and economical silhouette.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implementation brief

- Edit existing selectors instead of appending conflicting override blocks.
- Set shared column near 45rem; mobile gutters 20–24px.
- Remove decorative list/header/article/TOC/post-navigation separators. Keep semantic article `hr`, table structure, code toolbar boundaries, and focus outlines.
- Remove row-number markup everywhere and the unused CSS; remove post-row arrows and unused imports. Keep project external-link icons.
- Use 16–18px list titles, 13px metadata, section headings around 18px in normal case. Use 16–24px inter-entry gaps and 48–64px section gaps; tune to actual rendered content.
- Place post metadata below titles at all widths, with consistent compact rhythm.
- Projects form an unboxed two-column grid with 32–40px gaps, single column below approximately 640px.
- Remove article-divider element; space article heading, optional TOC, and prose with explicit margins.
- Theme-aware hover/focus-visible feedback, no text translation. Keep readable subdued text and existing reduced-motion behavior.
- Retain all current facts, content order, assets, routes, metadata, TOC, code tools, theme/client-navigation scripts. No new dependencies, deployment, commit, or configuration changes.
- Validate build, lint, image-alt check; inspect desktop/mobile, light/dark, indexes and representative article. Test client navigation as well as refresh.
