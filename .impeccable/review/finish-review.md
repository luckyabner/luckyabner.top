# Finish review — minimal redesign (2026-10-20)

Substituted review: the shipped `impeccable-finish-reviewer` was not spawned; this is a fresh in-thread pass run after the build edits were finished, disclosed here per the skill's degraded-path rule. Evidence is in `.impeccable/review/`.

## Verdict

**Ship.** The redesign meets the direction contract, removes the divider-line system the user disliked, and keeps every existing function (routes, both languages, both themes, TOC, code controls, client navigation). One defect found in review was fixed; no unresolved visual defects remain. A pre-existing content issue (image alt text) is out of scope for this pass and is reported below without being disguised.

## Contract audit — "The Quiet Personal Book"

| Contract promise | Result | Evidence |
| --- | --- | --- |
| ~720px (45rem) centered column, 20–24px mobile gutters | Met | `--page-width: 45rem`; measured column 720px at 1440, gutters 20px at 360–390 |
| 80px avatar + 32–36px greeting in first viewport | Met | `home-avatar` 5rem, `home-hero h1` clamp 2–2.25rem; single-column below 30rem |
| No decorative separators on lists, header, TOC, post nav | Met | zero matches for `row-number`, `row-arrow`, `article-divider`; no list borders in CSS |
| No ornamental row numbers, no trailing post arrows | Met | removed from homepage, both blog indexes, projects page and CSS |
| Titles before subdued metadata, metadata below at all widths | Met | 17px/500 title, 13px subtext line (date · time · language); verified at 390 and 1440 |
| Projects: unboxed two columns desktop, one mobile, external icons kept | Met | grid 2×2.5rem gaps; collapses at 40rem |
| Article heading → optional TOC → prose → post nav linked by spacing only | Met | prose `margin-top` 2.25–2.75rem; TOC no rule; post nav no rule |
| Sentence-case section headings around 18px | Met | 1.125rem/600, sentence case |
| Quiet signature interaction: text underline/color on hover/focus, no shift | Met | transparent 1px underline → `border-hover` on hover/`:focus-visible`; no transforms on rows |
| Preserve content, order, links, routes, languages, theme, code tools, a11y | Met | interaction checks below; diff is markup/CSS only, no content edits |
| No cards, shadows, gradients, dependency or config changes | Met | no `box-shadow` in the stylesheet; only code-collapse fade gradient; no new deps |

## Evidence

- `pnpm build` — 20 pages built, complete.
- `pnpm lint` — clean.
- Contrast (computed in OKLCH → linear sRGB): subtext 5.52:1 light / 6.39:1 dark; muted 4.66 / 4.84; secondary 7.79 / 8.90; text 15.81 / 14.63. All text roles pass 4.5:1.
- Layouts inspected: homepage, blog index, Chinese blog index, projects, article with TOC, article with code blocks — desktop 1440 and mobile 390, light and dark.
- Interaction checks against the production build: header client navigation (`/` → `/blog` → post), full refresh on article, theme toggle persists across reload (`html.dark`, `localStorage.theme`), TOC `<details>` opens with 7 entries, skip link receives first Tab with a 2px outline.
- Responsive: no horizontal overflow at 360px (`scrollWidth === clientWidth`); minimum interactive height 44px across rows, nav, and section links.
- Console: no errors.

## Defects found and fixed in this pass

1. **Orphaned language badge on narrow widths.** The `EN` mark lived inside the title, so a title that filled the line pushed the badge onto its own line above the date, reading as a stray label. Moved the mark into the metadata line (`date · time · EN`) on the homepage and both blog indexes, kept it in the link's accessible name via `aria-labelledby`, and removed the old margin. Verified at 390 and 1440 in light and dark, on all three lists.

## Residual risks / known issues

- `pnpm check:images` reports 41 images without descriptive alt text inside `src/content/blog/*.md`. This predates the redesign, lives in content (not UI), and was outside the approved scope; it is not caused by this change and should be handled as its own content task.
- The Astro dev toolbar overlays the bottom of pages in `pnpm dev`; it is dev-only and absent from `pnpm build` / `pnpm preview`, which is what the screenshots use.
- Dark-theme screenshots were taken with `prefers-color-scheme: dark`; the site's stored-theme path was verified separately through the toggle.

## Design system

`DESIGN.md` and `.impeccable/design.json` now document the settled system (tokens, hierarchy, layout, flat elevation, components, no-rule doctrine) so later work stays on-brand.
