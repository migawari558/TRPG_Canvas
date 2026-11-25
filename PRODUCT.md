# TRPG Canvas

<!-- impeccable:product-schema 1 -->

## Platform

web

React and Vite, packaged with Electron for desktop. Android has a separate interface and development branch; this redesign targets desktop only.

## Users

Japanese-speaking TRPG scenario authors who write a manuscript, organize its headings, and plan scenes in a linked flowchart.

## Product Purpose

Write and arrange a scenario locally, then export usable Markdown, HTML, PDF or Word documents.

## Capabilities and Constraints

- Preserve document content, local saving, heading links, scene editing, search, writing notes, custom fonts and custom themes.
- The app icon stays visible when the outline is closed. Only the outline closes.
- Body and flow share one mode switch and one scenario header. Formatting is a separate, content-width floating panel. Writing notes stay independent.
- Manuscript remains visible behind the upper controls. Avoid unnecessary introductory copy.
- All six built-in desktop themes and user-created themes remain supported.
- Develop this experimental redesign on `design`; merging and publishing require a subsequent user request.

## Evidence on Hand

Existing user instructions in this conversation; sample scenario in `src/model.mjs`; functional smoke tests in `tests/`.

## Product Principles

- Keep the writing area generous and the controls discoverable.
- Treat the outline, manuscript, scene flow and notes as distinct jobs.
- Keep exported reading and navigation usable.

## Current Redesign Priority

The user explicitly prioritizes organizing the outline and flow. Improve structural wayfinding, hierarchy, searching and the distinction between scenes, groups and information while keeping the manuscript generous.
