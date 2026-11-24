# Super Wonder Bros — Web Build

This repository contains the static GitHub Pages build of **Super Wonder Bros**,
a modern five-world platform adventure with classic run-and-jump rules.

## Play

Enable GitHub Pages for this repository and deploy from the `main` branch root.
The included workflow publishes the site automatically. The game also works from
any static HTTP host; no server-side application or database is required.

## Controls

- **Keyboard:** Arrows / WASD to move, Space / W / Up / Z to jump, Shift to dash,
  X / F for power-ups, S / Down to crouch or ground-pound, P / Esc to pause.
- **Gamepad:** D-pad / left stick to move, A to jump, X / B for power, RB / RT to
  dash, D-pad down to crouch, Start to pause or resume.
- **Touch:** Large multi-touch movement, jump, dash and power controls. Control
  size, handedness and visibility can be changed in Settings.

Hold jump for a higher arc. Assist mode adds two hearts and a second jump for
every hero. Checkpoints, settings, records and Continue progress are stored
locally in the browser.

## Accessibility

Semantic HTML menus, native dialogs, keyboard focus states, screen-reader labels,
live announcements, reduced motion, high contrast, separate audio volumes,
screen-shake control, safe-area support, and portrait / landscape layouts are
included. Touch targets exceed WCAG 2.2 minimum target-size guidance.

## Build and license

The publishable files are regenerated from the sibling `wonder-bros` source
repository with `npm run build`. Phaser is MIT licensed; see
`THIRD_PARTY_NOTICES.md` and `phaser.LICENSE.md`. All game art and music are
original procedural creations.

This is an unofficial fan project and is not affiliated with or endorsed by
Nintendo. Super Mario and related character names belong to their respective
owner.
