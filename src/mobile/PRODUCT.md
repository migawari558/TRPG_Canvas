# TRPG Canvas Android

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Japanese-speaking scenario authors who read and edit desktop-compatible TRPG scenario files on Android phones and tablets.

## Product Purpose

Write locally, open and save scenario files through Android document providers, navigate headings and inspect the scene flow.

## Capabilities and Constraints

Capacitor wraps a React WebView. Keep automatic draft saving, external-file synchronization and conflicts, keyboard viewport handling, independent outline and notes, and manuscript geometry while the header hides on scroll. Flow is read-only on Android. Nine built-in themes and author-selected text size remain available.

## Brand Commitments

Adapt the desktop's structural index direction and semantic palettes to Android: native-sized touch controls, tonal surfaces, obvious navigation, searchable headings, no desktop rail copied onto the phone.

## Current User Request

Refresh Android similarly to the desktop trial. Fix the home screen's red deletion background leaking around document rows. The red deletion area appears only during a swipe; an explicit neutral delete control opens confirmation. Original source files must not be deleted by removing a device draft.

## Development Constraints

Work on codex/android-design-refresh, isolated from unfinished desktop and flow work. Do not merge or release without a subsequent user request. Native verification uses an Android emulator; screenshots identify simulator evidence rather than physical hardware.

## Shared Theme Extension

The user requested black and gold plus other themes on both desktop and Android. Shared `src/themes.mjs` adds 黒金, 桜 and 深海; each platform inherits their semantic colors.
