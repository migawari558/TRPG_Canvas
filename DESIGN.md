---
name: TRPG Canvas Desktop
description: A bound manuscript and its structural index for Japanese scenario writing.
colors:
  forest-accent: "#2d664e"
  forest-on-accent: "#ffffff"
  forest-bg: "#e6ebe6"
  forest-paper: "#fcfdfb"
  forest-panel: "#f0f4ef"
  forest-text: "#243c33"
  forest-muted: "#526b5d"
  forest-border: "#cbd7cd"
  forest-soft: "#dae8dc"
  forest-rail: "#244b3c"
  forest-on-rail: "#f2f8f2"
  forest-rail-muted: "#b8cdbb"
  forest-rail-active: "#3c6651"
  tahoe-light-accent: "#315e8f"
  tahoe-light-on-accent: "#ffffff"
  tahoe-light-bg: "#e6ecf2"
  tahoe-light-paper: "#ffffff"
  tahoe-light-panel: "#f0f4f8"
  tahoe-light-text: "#263a50"
  tahoe-light-muted: "#566b80"
  tahoe-light-border: "#cbd7e2"
  tahoe-light-soft: "#dce8f4"
  tahoe-light-rail: "#294762"
  tahoe-light-on-rail: "#f1f7ff"
  tahoe-light-rail-muted: "#bed0e1"
  tahoe-light-rail-active: "#426583"
  tahoe-dark-accent: "#9ac4f5"
  tahoe-dark-on-accent: "#102b47"
  tahoe-dark-bg: "#131d2a"
  tahoe-dark-paper: "#1d2b3b"
  tahoe-dark-panel: "#172536"
  tahoe-dark-text: "#e5ecf4"
  tahoe-dark-muted: "#a4b7cc"
  tahoe-dark-border: "#354b62"
  tahoe-dark-soft: "#2e4460"
  tahoe-dark-rail: "#101a28"
  tahoe-dark-on-rail: "#e5f0ff"
  tahoe-dark-rail-muted: "#a4b9d1"
  tahoe-dark-rail-active: "#2a4360"
  parchment-accent: "#805433"
  parchment-on-accent: "#ffffff"
  parchment-bg: "#e8e0d3"
  parchment-paper: "#fbf8f0"
  parchment-panel: "#f1eadf"
  parchment-text: "#493b31"
  parchment-muted: "#705946"
  parchment-border: "#d8cbb8"
  parchment-soft: "#eaddc7"
  parchment-rail: "#624a36"
  parchment-on-rail: "#fff7ea"
  parchment-rail-muted: "#e0cbb3"
  parchment-rail-active: "#826248"
  midnight-accent: "#d4b5d6"
  midnight-on-accent: "#302038"
  midnight-bg: "#211e29"
  midnight-paper: "#2c2835"
  midnight-panel: "#26222f"
  midnight-text: "#ece6ef"
  midnight-muted: "#c1b1c8"
  midnight-border: "#51455c"
  midnight-soft: "#44364f"
  midnight-rail: "#1b1523"
  midnight-on-rail: "#f3e7f6"
  midnight-rail-muted: "#c6afcf"
  midnight-rail-active: "#4b3656"
  mono-accent: "#303738"
  mono-on-accent: "#ffffff"
  mono-bg: "#e8e9e9"
  mono-paper: "#ffffff"
  mono-panel: "#f2f3f3"
  mono-text: "#292c2d"
  mono-muted: "#606667"
  mono-border: "#d0d4d4"
  mono-soft: "#e0e4e4"
  mono-rail: "#303738"
  mono-on-rail: "#ffffff"
  mono-rail-muted: "#c1caca"
  mono-rail-active: "#505d5e"
typography:
  headline:
    fontFamily: "'Yu Gothic UI', 'Meiryo', sans-serif"
    fontSize: "calc(28px * var(--ui-scale))"
    fontWeight: 600
    letterSpacing: "0"
  title:
    fontFamily: "'Yu Gothic UI', 'Meiryo', sans-serif"
    fontSize: "calc(23px * var(--ui-scale))"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "var(--body-font)"
    fontSize: "var(--editor-font-size)"
    lineHeight: 1.95
  label:
    fontFamily: "'Yu Gothic UI', 'Meiryo', sans-serif"
    fontSize: "calc(12px * var(--ui-scale))"
rounded:
  toolbar-control: "4px"
  mode-control: "5px"
  control: "6px"
  field: "7px"
  toolbar: "8px"
  scene: "10px"
  panel: "12px"
spacing:
  compact: "4px"
  control-gap: "8px"
  group-gap: "12px"
  section: "16px"
  panel: "20px"
  gutter: "24px"
  page: "32px"
components:
  mode-selected:
    backgroundColor: "{colors.forest-accent}"
    textColor: "{colors.forest-on-accent}"
    rounded: "{rounded.mode-control}"
    padding: "4px 12px"
  button-secondary:
    backgroundColor: "{colors.forest-paper}"
    textColor: "{colors.forest-text}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  input-search:
    backgroundColor: "{colors.forest-paper}"
    textColor: "{colors.forest-text}"
    rounded: "{rounded.control}"
    height: "36px"
  scene-card:
    backgroundColor: "{colors.forest-paper}"
    rounded: "{rounded.scene}"
    padding: "16px"
---

# Design System: TRPG Canvas Desktop

## Overview

**Creative North Star: "The Bound Manuscript and Structural Index"**

The desktop workspace pairs a readable manuscript with a persistent structural index. A deep navigation rail anchors tinted working panels and a quiet paper surface. Japanese system UI lettering keeps operational controls familiar; manuscript fonts remain an author preference.

This system describes the desktop implementation in `src/desktop.css` and `src/desktop-themes.mjs`, together with its inherited document typography. Android retains its separate interface and styles. The six color families share component geometry and semantic roles, with custom themes supplying their own computed colors.

**Key Characteristics:**

- Dark binding, tinted structure, legible manuscript.
- Compact operational controls with visible focus and selection.
- Independent outline, formatting and writing notes.
- Flat document and library surfaces; restrained floating tools.

## Colors

Six coordinated families distinguish the binding, structural panels and paper without changing the workspace's visual grammar. The frontmatter records their reused role values; theme selection swaps the matching family together.

### Primary

- **Forest ink:** green action and selection colors in the default family.
- **Tahoe blue:** cool blue actions in light and dark families.
- **Parchment brown:** warm brown actions paired with cream paper; muted text uses the corrected readable brown.
- **Midnight mauve:** pale mauve actions on plum toned dark surfaces.
- **Monochrome ink:** charcoal actions on gray and white surfaces.
- **On-accent:** the family's contrasting foreground for solid selected modes and primary actions.

### Neutral

- **Background:** the surrounding workspace, distinct from manuscript paper.
- **Paper:** manuscript, input and compact action surfaces.
- **Panel:** outline, scenario header and notes surfaces.
- **Text / muted:** reading text and secondary metadata respectively.
- **Border / soft:** separators and contained selection tints.
- **Rail / on-rail / rail-muted / rail-active:** binding surface and its navigation states.
- Existing manuscript heading, chapter, quote, note, branch and ending roles remain supplied by document themes. They are content roles rather than additional global action accents.

### Named Rules

**The Bound Surface Rule.** Keep navigation, structural panels and manuscript paper as distinct semantic color roles in every theme.

**The Contained Selection Rule.** Active outline rows use a full soft tint; the selected body or flow mode uses solid accent and its paired foreground.

## Typography

**Body Font:** author-selected manuscript family through the body font variable; default Japanese UI sans serif.

**UI Font:** Yu Gothic UI, Meiryo, sans serif.

**Character:** Familiar system lettering supports dense Japanese controls. Manuscript headings inherit the theme and author settings, including Yu Mincho for default serif themes; UI headings use the system family. There is no separate marketing display face.

### Hierarchy

- **Headline:** library heading, semibold, with the frontmatter headline size.
- **Title:** scenario title, semibold, reducing to the observed compact size (21px times UI scale) below the first desktop breakpoint.
- **Body:** author-selected manuscript size (default 17px), generous line height; document heading multipliers remain inherited from appearance styles.
- **Outline:** readable navigation text (13px times UI scale), line height (1.55), semibold when active.
- **Label:** controls use the label role; secondary counts and metadata commonly step down to (11px times UI scale), status to (10px times UI scale).

## Layout

The desktop grid has a fixed navigation rail (60px), an outline (260px), and a flexible main pane. Hiding the outline collapses only its column. At (1150px), the outline narrows to (224px); at (900px), it becomes an overlay beside the retained rail. The compact breakpoint (680px) reduces gutters and hides secondary metadata. These are desktop responsive behaviors, not the Android design.

The manuscript has an observed maximum width (920px), generous lateral padding (58px), and controls layered above its reading area. The shared body/flow mode group, content-width formatting toolbar and independent notes toggle occupy separate control groups. Modes and formatting share one nonwrapping row; the formatting strip scrolls horizontally when space is limited. Notes are a side pane, becoming an overlay at the narrow desktop breakpoint. The library uses divided rows rather than a tile grid.

Spacing uses the compact steps in frontmatter, with larger page gutters where the reading and library surfaces need room. Outline indentation follows ancestry in steps (12px); search retains matching headings and their ancestors.

## Elevation & Depth

Paper, scenario rows and flow scenes are flat at rest. Tonal contrast and borders establish their hierarchy. Floating formatting, flow search and inspector surfaces use the desktop shadow; narrow-screen outline and notes overlays cast directional shadows. Tahoe-specific selectors still apply their inherited rounded treatment to paper and some containers, so geometry is not completely identical across all themes.

### Shadow Vocabulary

- **Floating tool:** `0 4px 14px #00000014`, for formatting, flow search and inspector.
- **Outline overlay:** `8px 8px 24px #00000018`.
- **Notes overlay:** `-8px 0 24px #00000018`.

### Named Rules

**The Working Depth Rule.** Reserve workspace elevation for floating tools and responsive overlays; regular manuscript and library surfaces remain flat.

## Shapes

Compact controls have gently rounded corners; larger flow cards and panels receive progressively broader corners from the frontmatter scale. Thin theme borders describe fields, groups and separators. The manuscript is predominantly rectangular with softened lower corners; Tahoe variants carry their observed larger rounding. Scene information uses a dashed border, while groups use a larger enclosing silhouette with a tinted heading.

## Components

### Buttons

Compact and familiar. Secondary flow actions use paper backgrounds, theme borders and the control radius; scene creation and the selected editing mode use solid accent with on-accent text. Ghost rail actions use the rail's state colors. Buttons transition background, foreground and border over (150ms ease-out); reduced motion disables this transition. Visible keyboard focus is a theme accent outline (2px) offset (3px); rail focus uses on-rail for contrast.

### Chips

Small counts and tags communicate structure. The outline total uses soft tint, accent text, compact padding (2px 7px) and small corners (4px). They remain metadata, not a substitute for selected navigation states.

### Cards / Containers

Flow scenes are paper surfaces with a thin border, scene radius and panel padding (16px). Selection adds a theme accent outline (2px) offset (3px). Information cards use dashed accent borders and panel backgrounds; groups use a translucent panel enclosure and soft tinted heading. Scenario library entries are divided horizontal rows with a document icon, title, statistics and update metadata; hover tints the row. The system name sits with statistics below the title and is included in library search alongside title and description.

### Inputs / Fields

Search fields pair paper fill with a thin theme border. The outline search is compact (36px minimum height), with a search icon and optional clear action. Its whole field receives focus feedback. Muted placeholders retain full opacity. Standard fields retain visible keyboard focus; disabled actions inherit the application's disabled state treatment.

### Navigation

The deep rail keeps the application mark and primary destinations accessible even when the outline closes. Icon buttons are square (40px) with softly rounded corners. Hover and current states use rail-active with on-rail text. The searchable outline shows indentation, collapse controls and flow-link indicators; reorder actions appear on hover or keyboard focus and remain visible on narrow layouts.

### Manuscript controls

The grouped body/flow selector has a panel enclosure, selected solid button and compact spacing. Formatting is its own paper tool strip with small square buttons (28px), active soft tints and a restrained floating shadow. Writing notes have an independent toggle and close action. Controls overlay the document stage while the manuscript remains continuous behind them.

## Do's and Don'ts

### Do:

- **Do** keep manuscript colors, structural panels and navigation roles distinct across all six palettes and custom themes.
- **Do** preserve author-selected manuscript fonts while using familiar Japanese system lettering for operational controls.
- **Do** retain visible keyboard focus, ancestry in outline search and differentiated scene, information and group geometry.
- **Do** keep outline, formatting and writing notes independently accessible.

### Don't:

- **Don't** hide the application rail when closing the outline.
- **Don't** turn active outline selection into a decorative side stripe.
- **Don't** apply this desktop system to Android's separate interface.
- **Don't** replace readable theme roles with incidental decorative colors.
