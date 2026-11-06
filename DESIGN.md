# Design

ENS Mobile has one look: a dark ground, real photographs closed off by a curve, large light
headlines, and content set directly on the page between clean hairlines. Nothing shouts until
something is wrong. When an alert arrives the calm breaks completely, and colour takes over the screen.

## Principles

- **Ink is the primary action.** One filled ink button marks the main action. Green marks
  a finished checklist or step, never a call to action or a status light. Acknowledgement is plain words.
- **Red means emergency.** `alarm` fills only live emergencies and raising one. Ordinary
  errors use `danger` text on a tinted ground. A stood-down incident loses its red.
- **Yellow means drill.** `drill`, `drillFill` and the hazard stripe mark drills and nothing else,
  always with the word "Drill".
- **Urgency sets the order.** Lists of incidents sort live before drill, then by severity,
  then by recency (`byUrgency`), never by time alone.
- **Say a fact once.** A screen states the title, location and time once.
- **Show the place.** Prefer a photograph or the map to another line of words.

## Tokens (`src/theme/tokens.ts`)

- Palette values come from the console's `globals.css`. The app uses the dark palette only.
- `accent` equals ink: selection, links and tints are neutral. Blue (`low`) is an information
  and "responding" tone, not an interaction colour.
- `severityBands` are the full-bleed alert fields, each with its own legible foreground. Medium is a deep amber, kept well away from drill yellow.
- Radii are tight: controls 6–8. Nothing is pill-shaped except a radio or a map pin.

## Type (`src/theme/typography.ts`)

- Hanken Grotesk says everything, in three weights: light (300) for headings, regular (400) for
  reading, medium (500) for emphasis. Nothing is heavier, including the full-screen alert.
- JetBrains Mono is only for identifiers read back over a radio: incident IDs, flight numbers,
  sectors, phone numbers. Never for labels or settings values.
- Every style is a variant in `typography.ts`. Screens do not set their own sizes or weights.
  `section` titles a group, `label` is every button, and `heroHeadline` opens a main screen.
- Counts and timers use tabular figures.

## Composition

- One margin: `gutter` (20). Headlines, section titles, rows and buttons all line up on it.
- `PageHead` opens every screen below the tabs: status words, a light title, then a quiet line.
- Every list row follows one pattern: title with its time at the right, the place, then one quiet line of facts.
- `HeroScreen` opens every tab: an image, a headline starting just under its curve in the same place every time, then content. The line never crosses words.
  Each tab has its own: Alerts the airfield at night, Checklists a crash tender, Command the airport map,
  Reports a radio in hand, Account the terminal.
- Sections sit on the page: a light title (`section`), hairlines the full width above and below, inset
  hairlines between rows. No cards, shadows or surface fills, except floating layers (toasts).
- Tabs are underlines. Status is plain coloured words, with no fill, glyph or badge. Only a live incident's severity carries colour.
- Empty states are words, left-aligned, with no icon in a circle. Full-screen moments (sent, locked) are left-aligned too.
- Rows have no leading icons. A row earns a glyph only for a real control, such as a phone to call, or a checklist step's state.
- No coloured side-stripes on rows, banners or toasts.

## Images

- Photographs come from `tools/compose-visuals.py`, which gives them one grade and the shared curve.
  Credits are in `assets/images/heroes/CREDITS.md` and on the About screen. Replace them with
  photographs of Noida whenever those exist.
- `AirportMap` is drawn from OpenStreetMap geometry. It orients people and is not an operational chart.
  A pin only ever marks a real reported position, never a guess from a place name.
- `ImageBox` frames attachments, a person's photo, and anything still to come.

## Signature moment

The full-screen alert is the one expressive surface: a severity field holding what, where and
a large running timer, closed off by the app's curve with its light running while a response is
owed. Detail and the response dock sit below on the page. Its slow pulse stops under reduced motion.

## Motion

- A light runs along the hero's curve, right to left. It is the only other ambient animation.
  It stops when the screen loses focus, while a form is open, and under reduced motion.
- While someone owes a response, the hero dims and its light stops, so the red card comes first.
- 150–220 ms ease-out for state changes. A slight press scale on buttons.
