---
name: TRPG Canvas Android
description: A touch-first adaptation of the desktop manuscript and structural index.
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
  forest-heading: "#28543f"
  forest-quote: "#eaf1e9"
  forest-note: "#f1efdf"
  tahoe-light-accent: "#315e8f"
  tahoe-light-on-accent: "#ffffff"
  tahoe-light-bg: "#e6ecf2"
  tahoe-light-paper: "#ffffff"
  tahoe-light-panel: "#f0f4f8"
  tahoe-light-text: "#263a50"
  tahoe-light-muted: "#566b80"
  tahoe-light-border: "#cbd7e2"
  tahoe-light-soft: "#dce8f4"
  tahoe-light-heading: "#2c517c"
  tahoe-light-quote: "#edf3f9"
  tahoe-light-note: "#eef1e9"
  tahoe-dark-accent: "#9ac4f5"
  tahoe-dark-on-accent: "#102b47"
  tahoe-dark-bg: "#131d2a"
  tahoe-dark-paper: "#1d2b3b"
  tahoe-dark-panel: "#172536"
  tahoe-dark-text: "#e5ecf4"
  tahoe-dark-muted: "#a4b7cc"
  tahoe-dark-border: "#354b62"
  tahoe-dark-soft: "#2e4460"
  tahoe-dark-heading: "#bbd5f4"
  tahoe-dark-quote: "#26394e"
  tahoe-dark-note: "#343b3c"
  parchment-accent: "#805433"
  parchment-on-accent: "#ffffff"
  parchment-bg: "#e8e0d3"
  parchment-paper: "#fbf8f0"
  parchment-panel: "#f1eadf"
  parchment-text: "#493b31"
  parchment-muted: "#705946"
  parchment-border: "#d8cbb8"
  parchment-soft: "#eaddc7"
  parchment-heading: "#744c30"
  parchment-quote: "#f1eada"
  parchment-note: "#f0e5cb"
  midnight-accent: "#d4b5d6"
  midnight-on-accent: "#302038"
  midnight-bg: "#211e29"
  midnight-paper: "#2c2835"
  midnight-panel: "#26222f"
  midnight-text: "#ece6ef"
  midnight-muted: "#c1b1c8"
  midnight-border: "#51455c"
  midnight-soft: "#44364f"
  midnight-heading: "#dfc5df"
  midnight-quote: "#382e43"
  midnight-note: "#403735"
  mono-accent: "#303738"
  mono-on-accent: "#ffffff"
  mono-bg: "#e8e9e9"
  mono-paper: "#ffffff"
  mono-panel: "#f2f3f3"
  mono-text: "#292c2d"
  mono-muted: "#606667"
  mono-border: "#d0d4d4"
  mono-soft: "#e0e4e4"
  mono-heading: "#292e2f"
  mono-quote: "#f0f2f2"
  mono-note: "#ecefee"
  error-light: "#a7352b"
  error-dark: "#ffb4ab"
  error-reveal: "#a7352b"
  on-error: "#ffffff"
  obsidian-gold-accent: "#d8b66c"
  obsidian-gold-on-accent: "#171711"
  obsidian-gold-bg: "#10110f"
  obsidian-gold-paper: "#171816"
  obsidian-gold-panel: "#1d1f19"
  obsidian-gold-text: "#eae5d7"
  obsidian-gold-muted: "#b6ad98"
  obsidian-gold-border: "#494632"
  obsidian-gold-soft: "#302c1f"
  obsidian-gold-heading: "#e0c586"
  obsidian-gold-quote: "#22251b"
  obsidian-gold-note: "#2e2a1d"
  sakura-accent: "#9c455f"
  sakura-on-accent: "#ffffff"
  sakura-bg: "#f0e7e9"
  sakura-paper: "#fffafa"
  sakura-panel: "#f8f0f1"
  sakura-text: "#4a343c"
  sakura-muted: "#7e606b"
  sakura-border: "#ddc8d0"
  sakura-soft: "#f0dce3"
  sakura-heading: "#8c405a"
  sakura-quote: "#f7e9ed"
  sakura-note: "#f6eddc"
  ocean-accent: "#75c9c4"
  ocean-on-accent: "#103332"
  ocean-bg: "#0d2026"
  ocean-paper: "#152a30"
  ocean-panel: "#11252c"
  ocean-text: "#dceef0"
  ocean-muted: "#a0bdc3"
  ocean-border: "#38545b"
  ocean-soft: "#24414a"
  ocean-heading: "#8fdad2"
  ocean-quote: "#1c353c"
  ocean-note: "#2a3a33"
typography:
  headline:
    fontFamily: "system-ui, 'Meiryo', sans-serif"
    fontSize: "20px"
    fontWeight: 600
  library-title:
    fontSize: "19px"
    fontWeight: 600
  document-title:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "var(--body-font)"
    fontSize: "var(--editor-font-size, 14px)"
    lineHeight: 1.95
  label:
    fontFamily: "system-ui, 'Meiryo', sans-serif"
    fontSize: "14px"
  metadata:
    fontSize: "12px"
rounded:
  mode: "7px"
  control: "8px"
  field: "10px"
  surface: "12px"
  dialog: "20px"
spacing:
  compact: "4px"
  control: "8px"
  row-gap: "10px"
  group: "12px"
  panel: "16px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.mono-accent}"
    textColor: "{colors.mono-on-accent}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.mono-paper}"
    textColor: "{colors.mono-accent}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
    height: "52px"
  search-field:
    backgroundColor: "{colors.mono-paper}"
    textColor: "{colors.mono-text}"
    rounded: "{rounded.field}"
    height: "48px"
  draft-row:
    backgroundColor: "{colors.mono-paper}"
    textColor: "{colors.mono-text}"
    rounded: "{rounded.surface}"
  selected-mode:
    backgroundColor: "{colors.mono-accent}"
    textColor: "{colors.mono-on-accent}"
    rounded: "{rounded.mode}"
    height: "48px"
    padding: "4px 12px"
---

# Design System: TRPG Canvas Android

## Overview

**Creative North Star: "The Bound Manuscript and Structural Index"**

Android adapts the desktop structural index into a tonal, touch-first library and reading workspace. Paper holds the manuscript and document rows; tinted panels frame navigation and formatting. Japanese system UI lettering keeps operational controls familiar.

This child system describes Android only. Nine semantic families retain desktop color relationships while navigation becomes a phone header, grouped modes and independent drawers. The manuscript stays geometrically stable as reading hides the header. Destructive color appears only in an intentional swipe reveal or confirmation.

**Key Characteristics:**

- Tonal navigation, readable paper and nine coordinated palettes.
- Primary touch controls sized for Android.
- Neutral draft rows with contained destructive reveal.
- Independent outline and notes; keyboard-aware bottom formatting.

## Colors

Nine families share the desktop semantic relationships: forest green; Tahoe blue in light and dark; warm parchment; dark mauve midnight; monochrome; black with gold (黒金 / obsidian-gold); pale sakura with deep rose (桜 / sakura); and deep teal with mint (深海 / ocean). Monochrome is the Android default. The first six families use overrides in mobile-themes.mjs. The three added families inherit their semantic values unchanged from ../themes.mjs. Frontmatter records the effective mobile values, not superseded baseline styles.

### Primary

- **Family ink:** actions, selected body/flow mode, linked metadata and focus.
- **On-accent:** contrasting foreground on solid controls.

### Secondary

- **Error light / error dark:** destructive confirmation text adjusted for theme brightness through shared isDarkTheme detection, including the added black/gold and ocean dark families.
- **Error reveal / on-error:** intentional swipe background and its white label, independent of the resting draft surface.

### Neutral

- **Workspace:** library and surrounding flow area.
- **Paper:** manuscript, search, draft surfaces and flow preview.
- **Panel:** tonal header, mode bar and bottom formatting.
- **Text / muted:** reading and supporting metadata.
- **Border / soft:** fine separation and contained interaction tints.
- **Heading / quote / note:** document hierarchy and reading insets.

### Named Rules

**The Semantic Family Rule.** Swap the whole theme family together; paper, structural panels, text and selection keep distinct roles.

**The Contained Destruction Rule.** Draft rows and delete icons stay neutral at rest. Red is reserved for the active swipe reveal and destructive confirmation.

## Typography

**UI Font:** system-ui, Meiryo, sans-serif.

**Body Font:** inherited document body family; Android settings control manuscript size.

**Character:** Clear Japanese operational lettering with a compact hierarchy. Strong titles establish structure without a separate display face.

### Hierarchy

- **Headline:** drawer, flow and dialog headings use the headline role; home uses library-title.
- **Title:** draft titles use document-title and wrap; the editable scenario header truncates as needed.
- **Body:** manuscript defaults to (14px), adjustable from (10px) to (24px), with the frontmatter line height. Document headings are semibold and use the theme heading role.
- **Label:** search, settings and outline navigation commonly use the label role; compact mode and toolbar labels also use (12px) or (13px).
- **Metadata:** draft and scene context use metadata; save state and flow summary include (11px) text.

## Layout

The app is a vertical viewport-height workspace. Phone home actions stack above draft count, search and full-width rows. At (600px), actions share two columns, the library centers within an observed maximum width (760px), and manuscript side padding centers the reading area around (720px).

Header minimum height is (60px), mode bar minimum height (64px). Primary buttons, modes, search clear controls, outline navigation and formatting use minimum targets (48 CSSpx). Home actions reach (52px); draft open surfaces reach (96px). Drawer close and save-state action controls also use the final minimum height (48px).

Independent outline and notes drawers occupy the smaller of (92vw) and (384px). Outline depth adds indentation in steps (16px). Measured header, mode and save-state dimensions establish stable manuscript top padding. Reading hides header and metadata as overlays while the mode bar moves upward; document padding remains unchanged.

Formatting stays inside the visual viewport, which resizes with the keyboard, and retains safe-area bottom padding. The read-only flow preview has final height clamp(220px, 32dvh, 320px), followed by a readable scene/information list.

## Elevation & Depth

Thin borders and tonal surfaces provide normal hierarchy. Manuscript paper has no border or shadow. Drawers and confirmation sit over a translucent shade; only the formatting popover uses a diffuse shadow.

### Shadow Vocabulary

- **Formatting popover:** (0 6px 20px #0000001a).
- **Drawer shade:** (#0006), a translucent scrim rather than a shadow.

### Named Rules

**The Stable Manuscript Rule.** Hide reading chrome by overlay transforms and clipping, without changing manuscript padding during the gesture.

## Shapes

Controls use softly rounded corners. Search and home actions use the field radius; draft rows, flow preview and format popovers share surface rounding. Confirmation uses the larger dialog radius. Drawers round exposed outer corners. Manuscript paper remains rectangular. Thin theme borders enclose neutral draft surfaces, replacing the former left stripe and exposed red backing.

## Components

### Buttons

Touch-sized and operational. Home open uses solid family ink and its foreground; new-scenario uses paper, border and accent text. The selected mode uses a solid pair within a soft group. Button color transitions take (140ms ease-out), disabled under reduced motion. Visible focus uses an accent outline (2px), offset (2px).

### Cards / Containers

Draft rows have paper fill, a thin border and surface radius. Open and delete are separate controls; delete is muted at rest. Swiping translates the complete foreground and reveals red only while its offset is nonzero. A sufficient swipe or delete icon opens confirmation, which explains device-draft scope and distinguishes original files.

Manuscript quotes and GM notes use tonal insets and rounded corners (8px); notes also carry a thin border. Ordinary paper remains flat.

### Inputs / Fields

Home and outline search share paper fill, thin borders, field radius and whole-field focus. Muted placeholders retain full opacity. Clear is a separate touch control. Home search matches title, system name and subtitle. Outline search retains ancestors and disables collapse controls while filtering.

### Navigation

A tonal phone header replaces the desktop rail. Outline, grouped body/flow modes and notes remain independent. Outline rows use rounded soft hover feedback and separate collapse and navigate controls. The reading surface continues behind hiding chrome.

### Read-only flow

The diagram supports zoom from (100%) to (300%) and two-direction scrolling. Below it, scene/information rows provide wrapping labels, parent-group context and body navigation for linked headings. Flow editing is absent on Android.

### Bottom formatting

Main buttons are square (48px), with active soft tints and accent text. Additional formats open above the toolbar. Notes formatting scrolls horizontally. Visual viewport resizing and safe-area padding keep tools above the keyboard. Toolbar interactions preserve the active editing selection.

## Do's and Don'ts

### Do:

- **Do** preserve semantic theme roles in light and dark families.
- **Do** use the observed 48px primary touch targets and retain readable document text.
- **Do** keep home and outline search available, with ancestry retained in outline results.
- **Do** keep bottom formatting within the resized visual viewport and respect safe-area padding.

### Don't:

- **Don't** copy the desktop navigation rail onto the phone.
- **Don't** expose a red row background at rest or style the ordinary draft delete icon as a danger action.
- **Don't** reflow the manuscript when the reading header hides.
- **Don't** imply Android flow cards can be edited or that deleting a device draft deletes its source file.
