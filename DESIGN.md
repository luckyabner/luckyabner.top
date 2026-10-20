---
name: Abner’s Personal Site
description: A quiet personal book page for a developer’s writing and projects.
colors:
  paper: "oklch(98.6% 0.003 75)"
  surface: "oklch(96.5% 0.004 75)"
  surface-secondary: "oklch(94% 0.005 75)"
  rule: "oklch(88% 0.006 75)"
  rule-strong: "oklch(79% 0.008 75)"
  ink: "oklch(24% 0.008 75)"
  ink-soft: "oklch(43% 0.008 75)"
  ink-muted: "oklch(51% 0.007 75)"
  ink-faint: "oklch(55% 0.006 75)"
  accent: "oklch(52% 0.055 250)"
  accent-strong: "oklch(44% 0.06 250)"
  hover-wash: "oklch(95.5% 0.005 75)"
  focus-ring: "oklch(60% 0.11 250)"
  code-canvas: "oklch(25% 0.008 75)"
  code-rule: "oklch(36% 0.009 75)"
  code-ink: "oklch(94% 0.005 75)"
  code-ink-muted: "oklch(73% 0.006 75)"
typography:
  display:
    fontFamily: "Maple Mono, Maple Mono CN, ui-monospace, monospace"
    fontSize: "clamp(2rem, 1.7rem + 1.2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Maple Mono, Maple Mono CN, ui-monospace, monospace"
    fontSize: "clamp(1.9rem, 1.6rem + 1.2vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Maple Mono, Maple Mono CN, ui-monospace, monospace"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Maple Mono, Maple Mono CN, ui-monospace, monospace"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.82
  label:
    fontFamily: "Maple Mono, Maple Mono CN, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "0.2rem"
  md: "0.35rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.75rem"
  xl: "2.5rem"
  section: "clamp(3rem, 7vh, 4rem)"
components:
  nav-link:
    textColor: "{colors.ink-muted}"
    height: "2.75rem"
    padding: "0 0.5rem"
  nav-link-hover:
    textColor: "{colors.ink}"
  post-row:
    textColor: "{colors.ink}"
    padding: "0.75rem 0"
  project-row:
    textColor: "{colors.ink}"
    padding: "0.25rem 0"
  code-block:
    backgroundColor: "{colors.code-canvas}"
    textColor: "{colors.code-ink}"
    rounded: "{rounded.md}"
    padding: "0"
  theme-toggle:
    textColor: "{colors.ink-muted}"
    size: "2.75rem"
    height: "2.75rem"
    width: "2.75rem"
---

# Design System: Abner’s Personal Site

## Overview

**Creative North Star: "The Quiet Personal Book"**

The site reads like a well-set personal book: a narrow page, generous margins, and almost no furniture. Hierarchy comes from proximity, scale, and weight alone — there is no card wall, no row numbering, no horizontal rule between entries, no trailing arrow on a post. The interface steps back so the writing and the work can be met without ceremony.

The palette is warm off-white and charcoal in light, deep charcoal and warm gray in dark, with one restrained blue accent reserved for focus and link emphasis. Typography is Maple Mono, self-hosted: the Latin faces come from Fontsource and the Simplified Chinese glyphs from pre-split Maple Mono CN ranges, so one typeface covers both scripts at a fixed 2:1 rhythm. Character comes from that single rounded mono voice, tight tracking on headings, and open leading in prose. Density is low by design: one column of text, one two-column project grid, and 44px touch targets on every control.

**Key Characteristics:**
- A centered 45rem reading column with a single vertical rhythm.
- Separation by whitespace; rules survive only where they carry meaning (code chrome, table structure, article `hr`).
- Metadata lives under titles at every width, quiet and tabular.
- Flat surfaces: no shadows, gradients, or elevated cards.
- Both themes carry equal weight; nothing is designed only for light.

## Colors

A warm neutral paper/charcoal pairing with a single cool blue accent used sparingly.

### Primary
- **Quiet Blue** (`oklch(52% 0.055 250)`, dark `oklch(72% 0.05 250)`): focus rings on interactive elements and inline link emphasis inside prose. Its rarity is the point.

### Neutral
- **Warm Paper** (`oklch(98.6% 0.003 75)`, dark `oklch(17% 0.008 75)`): the page background in each theme.
- **Soft Paper** (`oklch(96.5% 0.004 75)`, dark `oklch(21% 0.009 75)`): inline code chips and quiet surfaces.
- **Deeper Paper** (`oklch(94% 0.005 75)`, dark `oklch(25% 0.01 75)`): secondary surfaces such as code toggle strips.
- **Hairline** (`oklch(88% 0.006 75)`, dark `oklch(31% 0.009 75)`): structural borders on code blocks and tables only.
- **Hairline Strong** (`oklch(79% 0.008 75)`, dark `oklch(40% 0.01 75)`): underline and border emphasis on hover.
- **Charcoal Ink** (`oklch(24% 0.008 75)`, dark `oklch(91% 0.006 75)`): titles and primary copy.
- **Soft Ink** (`oklch(43% 0.008 75)`, dark `oklch(76% 0.007 75)`): roles, secondary copy, prose body.
- **Quiet Ink** (`oklch(51% 0.007 75)`, dark `oklch(67% 0.007 75)`): metadata, navigation, footer — still ≥4.5:1 on paper.
- **Faint Ink** (`oklch(55% 0.006 75)`, dark `oklch(60% 0.007 75)`): icons and arrows only.
- **Night Code** (`oklch(25% 0.008 75)` light and dark): code blocks stay dark in both themes, set off by a 1px `code-rule` border.

### Named Rules
**The No-Rule Rule.** Horizontal rules never separate list entries, article header sections, TOC, or post navigation. Keep them only for semantic content (`<hr>` in prose), tables, and code chrome.

## Typography

**Display Font:** Maple Mono (Latin, Fontsource) with Maple Mono CN for CJK, then ui-monospace, monospace.
**Body Font:** the same stack; every text role shares one voice.
**Label/Mono Font:** none separate — the site is monospaced by design, so code and prose share the face.

**Character:** rounded, bookish and bilingual-safe. Maple Mono gives Latin and CJK the same 2:1 mono rhythm; headings are tight and confident, body copy open and unhurried. Chinese headings keep a lighter tracking so CJK glyphs are not cramped. Weights resolve per script: Latin uses real 400/500/600/700 faces, Chinese uses real 400/500/700 faces (600 requests fall to 700), so bold text is never synthesized. The tagline uses the true Maple Mono Italic.

### Hierarchy
- **Display** (700, `clamp(2rem, 1.7rem + 1.2vw, 2.25rem)`, 1.15): homepage greeting.
- **Headline** (700, `clamp(1.65rem…2rem)` page titles; `clamp(1.9rem…2.35rem)` article titles, 1.15–1.2, `-0.035em`): one per page.
- **Title** (500, 17px, 1.4, `-0.015em`): post and project names; underline appears on hover/focus, never a color shift alone.
- **Section heading** (600, 18px, 1.4, `-0.01em`, sentence case): "Latest writing", "Selected projects".
- **Body** (400, 17px, 1.82): article prose at a 65ch measure; secondary ink, never pure charcoal.
- **Label** (400, 13px, 1.4, tabular numerals): dates, reading time, footer. The language mark is 10px/600 with `0.08em` tracking.

### Named Rules
**The One Voice Rule.** Type comes from Maple Mono at every size, including code. Do not mix in a second family; use size, weight, and color for hierarchy.
**The Self-Hosted Rule.** Fonts load from the site's own build: Fontsource Latin faces plus pre-split Maple Mono CN ranges. No external font CDN, no preloading of CN chunks (the browser fetches only the ranges a page needs).
**The Metadata-Below Rule.** Date, reading time, and language mark always sit beneath the title as one quiet line, at every breakpoint.
**The Sentence-Case Rule.** Section headings are written in natural case; no uppercase eyebrow or kicker introduces a section.

## Layout

One centered column: `--page-width: 45rem` with `--page-gutter: clamp(1.25rem, 4.5vw, 3rem)`. The page shell is a full-height flex column so the footer sits at the bottom of short pages.

- **Homepage:** an 80px circular avatar beside a 32–36px greeting; role, italic tagline, and two text links (GitHub, RSS) follow. Sections start after `clamp(3rem, 7vh, 4rem)`, and their heading row pairs a left-aligned 18px heading with a right-aligned 13px "All posts →".
- **Lists:** block-level rows, 12px block padding, 16–24px between entries, no borders. Post metadata sits directly under the title with 6px separation.
- **Projects:** unboxed two-column grid on wide screens (`2.25rem` row gap, `2.5rem` column gap), one column below 40rem.
- **Article:** back link, title, metadata line, optional `<details>` TOC, then prose 2.25–2.75rem below. Post navigation closes the page with no rule above it.
- **Breakpoints:** 30rem switches the hero to a single column; 40rem collapses the project grid.
- **Touch targets:** interactive controls carry `min-height: 2.75rem` (44px), including text links that look small.

## Elevation & Depth

There are no shadows anywhere in the system. Depth is carried by type scale and whitespace; surfaces stay flat. The only bounded surfaces are code blocks, which use a 1px hairline plus a tonal shift to the dark code palette, and inline code chips, which use `surface-secondary` with no border.

## Shapes

Essentially square geometry with three deliberate radii: `0.2rem` for inline code chips, `0.35rem` for code blocks, and a full `999px` pill for the avatar. Avatars are circular; everything else is rectilinear. Cards, outlines around list rows, and decorative dividers do not exist.

## Components

### Navigation
A signature mark (masked PNG in `currentColor`) on the left and three controls on the right: Blog, Projects, theme toggle. Links are 14px quiet ink, 44px tall, with `0.5rem` inline padding; the active page and hover state move to charcoal. Focus shows a 2px `focus-ring` outline offset 4px. Nothing is underlined at rest.

### Theme toggle
A 44×44px transparent button holding a 16px sun/moon glyph. Toggling flips the `dark` class on `<html>`, persists the choice in `localStorage`, and runs a view-transition reveal from the toggle.

### Post row
One `<a>` containing a 17px/500 title and a 13px metadata line (date · reading time · language mark). Rows are 44px+ tall, full-column width, no border, no arrow. Hover and `:focus-visible` draw a 1px underline under the title in `rule-strong`; the language mark steps up to soft ink.

### Project row
Two per row on desktop. Name, one-sentence description, and a 17px external-link glyph pinned to the row's right edge. Hover underlines the name and darkens the glyph; no boxes or images.

### Article chrome
Back link and TOC summary are 13px quiet ink at 44px height. The TOC is a native `<details>` with indented nested levels and no bottom rule. Prose links are charcoal with a hairline underline that turns accent on hover; blockquotes use a single 1px left rule.

### Code block
Dark canvas in both themes, 1px `code-rule`, `0.35rem` radius. A 44px toolbar shows the line count on the left and Copy on the right; long blocks collapse behind a full-width toggle. Buttons are 12px, transparent, and switch to `code-ink` on hover.

### Footer
13px quiet ink, one line: GitHub · RSS, left-aligned to the column, 44px tall links, no rule above.

## Do's and Don'ts

### Do:
- **Do** keep the 45rem column and let whitespace do the separating.
- **Do** place metadata under titles, in quiet ink, with tabular numerals.
- **Do** keep every interactive element at least 44px tall, even when the label is 13px.
- **Do** express hover and focus with a 1px underline in `rule-strong` and a visible 2px focus ring.
- **Do** check both themes and both scripts (Latin and CJK) when changing type or spacing.

### Don't:
- **Don't** add horizontal rules between posts, projects, header, TOC, or post navigation.
- **Don't** add row numbers, trailing arrows on posts, or uppercase section kickers.
- **Don't** introduce cards, shadows, gradients, or bordered list rows.
- **Don't** set metadata above the title or shrink it below 13px (the 10px language mark is the only exception).
- **Don't** add webfonts; Maple Mono, self-hosted from Fontsource and Maple Mono CN, is the site's only typeface.
