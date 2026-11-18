# BRAND.md: Who's That? A Family Album Game

Every UI decision in `guess-who/` traces back to this file. If a value isn't
in here, it doesn't ship. Colors, type, spacing, radii and motion live in one
tokens file (`tokens.css`), and nothing else hard-codes them.

> **Status:** draft for approval. No screens have changed yet.

---

## 0. The game in one line

**Who's That?** is a cozy two-player guessing game for one couple, Valerie and
Bobby, starring their whole family. They play from separate rooms on the days
they can't be together, and side by side on the days they can.

**Audience:** two adults in their 60s and 70s, on iPhones, sometimes an iPad.
Comfortable with texting, not with games. Big type, plain words, nothing to
learn twice.

**Name:** "Who's That?" replaces "Guess Who?". The old name belongs to an
existing board game; this one is ours, and it says what a family album makes
you say.

---

## 1. Brand core

**Promise:** Every turn should feel like flipping through the family album
together: a little mystery, a lot of "oh, look at *them*."

**It is:** Warm · Homemade · Teasing
**It is not:** Slick · Childish · Techy

**Physical-world reference:** *A well-loved 1970s family photo album.*
Cream album pages, a kraft-brown cover, black paper photo corners holding up
white-bordered prints, and captions punched out on a Dymo label maker.

What that means on screen:

| Album thing | Game thing |
|---|---|
| Album page (cream paper) | Screen background |
| White-bordered print held by photo corners | Every person card, the mystery person, the reveal |
| Dymo label tape (raised white capitals on dark tape) | Section labels, small tags, the score strip |
| Kraft cover / page divider | Panels and the bottom bar |
| Turning a photo face-down | Flipping a card down |
| Writing in the margin | Notes from the family, question history |

---

## 2. Logo / wordmark

**Primary lockup** (home screen, splash, gift note)
- "Who's That?" set in **Fraunces 900, SOFT 100, WONK 1**, color `ink` `#2A1F18`.
- Sits on a white print `card` `#FFFBF2` with a 12pt white border, rotated **-2°**,
  held by two **black photo corners** (`cover` `#3A2A1F`) at top-left and bottom-right.
- Under it, a Dymo strip reading **A FAMILY ALBUM GAME**: Source Sans 3 700,
  14pt, +10% tracking, `card` `#FFFBF2` text on `tape` `#2B2B2E`.
- The apostrophe and question mark are set in `primary` `#B4451F`. They are the
  only brand-color parts of the wordmark.

**Compact mark** (app icon, splash loader, favicon)
- A square white print, rotated -4°, on a `page` `#F6EEDD` field, held by two
  black photo corners. Inside the print: a single **?** in Fraunces 900,
  `primary` `#B4451F`, 60% of the print height.

**Minimum size**
- Primary lockup: 180pt wide.
- Compact mark: 29pt (the smallest iOS icon), 48pt anywhere else in the app.

**Clear space:** equal to the cap height of the wordmark on all sides.

**Never:** stretch it, recolor it outside this palette, add a drop shadow, add
a gradient, or place it on a photo or busy background without its white print
backing.

---

## 3. Color system

### Core colors

| Role | Name | Hex | Used for |
|---|---|---|---|
| Primary | Hutch Orange | `#B4451F` | The ONE main action per screen, the wordmark punctuation, the heart. |
| Primary (pressed) | Hutch Orange Deep | `#963818` | Pressed state of primary buttons only. |
| Secondary | Avocado | `#56652A` | Secondary actions, active tab, selected chips, "your turn" marks. |
| Background 1 | Album Page | `#F6EEDD` | Screen background. |
| Background 2 | Kraft | `#E8D9BC` | Panels, bottom bar, page dividers. |
| Background 3 | Print White | `#FFFBF2` | Cards, prints, input fields, modals. |
| Ink | Album Ink | `#2A1F18` | All body text and icons. |
| Ink (soft) | Faded Ink | `#6B5A4A` | Secondary text and captions. |

### Neutrals

| Name | Hex | Used for |
|---|---|---|
| Cover Brown | `#3A2A1F` | Photo corners, outlines, dark-mode background. |
| Dymo Tape | `#2B2B2E` | Label-tape strips. |
| Shadow Paper | `#CDB892` | The hard "layered paper" offset under panels and cards. |
| Rule | `#D9C7A6` | 1px dividers between list rows. |

### Players (each player's own color, tuned to the album)

| Player | Name | Hex | Used for |
|---|---|---|---|
| Valerie | Rose Print | `#A8436A` | Her avatar ring, her score, her side of the reveal. |
| Bobby | Denim | `#2F5F93` | His avatar ring, his score, his side of the reveal. |

The phone owner's color never replaces Primary for the main action. It's only
used for that player's own marks.

### Feedback

| State | Name | Hex | Always paired with |
|---|---|---|---|
| Success | Garden | `#3E7A4C` | ✓-check icon + the word ("Yes", "Right") |
| Warning | Mustard | `#9A6B0E` | !-triangle icon + a sentence |
| Danger | Brick | `#9C2F2A` | ✕-cross icon + the word ("No", "Wrong") |
| Reward | Gold Leaf | `#8A6212` | Ribbon/trophy icon + a number or word |

Feedback-colored **text** only ever sits on Print White `#FFFBF2`. On Album
Page or Kraft, the text is Ink and only the icon takes the feedback color.

### Contrast (WCAG ratios, computed)

| Text | Background | Ratio |
|---|---|---|
| Album Ink | Album Page / Kraft / Print White | 13.91 / 11.53 / 15.55 |
| Faded Ink | Album Page / Kraft / Print White | 5.71 / 4.73 / 6.38 |
| Print White | Hutch Orange / Hutch Orange Deep | 5.33 / 7.07 |
| Print White | Avocado | 6.18 |
| Hutch Orange | Album Page / Print White | 4.77 / 5.33 |
| Garden / Mustard / Brick / Gold Leaf | Print White | 4.97 / 4.54 / 7.13 / 5.30 |
| Rose Print / Denim | Print White | 5.53 / 6.40 |
| Album Page | Cover Brown (dark mode) | 11.88 |
| Print White | Dymo Tape | 12.23 |

Every pair the UI uses is at least 4.5:1.

### Rules
- **60 / 30 / 10:** about 60% Album Page and Kraft; 30% Print White cards,
  Avocado and neutrals; 10% Hutch Orange.
- **One shout per screen:** only one element per screen is filled Hutch Orange.
  If two are, one of them becomes Avocado or an outline.
- **Never by color alone:** Yes/No, flipped/unflipped, whose turn, new/read and
  right/wrong each have an icon, a shape change or a word as well as a color.
- **Dark mode** (when the phone is set to dark): background Cover Brown
  `#3A2A1F`, panels `#4A3829`, prints stay Print White. It's the album
  closed, not a black app.

---

## 4. Typography (2 families)

**Display: Fraunces** (Google Fonts, variable). Soft, chunky, 1970s-serif
warmth that matches the album's era. Used for: the wordmark, screen titles,
the mystery-person name, the big score, the reveal. Settings: `SOFT 100`,
`WONK 0` (the wordmark alone uses `WONK 1`).

**UI / body: Source Sans 3** (Google Fonts, variable). Very legible at small
sizes, with tabular figures: every number uses `font-variant-numeric:
tabular-nums` so scores and counts never jitter.

### Type scale (points; one scale, no sizes off it)

| Step | Phone | Tablet | Family / weight | Line height | Tracking | Used for |
|---|---|---|---|---|---|---|
| Label | 14 | 16 | Source Sans 3 / 700, CAPS | 1.2 | +8% | Dymo labels, section labels |
| Caption | 15 | 17 | Source Sans 3 / 400 | 1.35 | 0 | Secondary lines, times ("3 hrs ago") |
| Body | 17 | 19 | Source Sans 3 / 400 & 600 | 1.4 | 0 | Body text, list rows, card names |
| Button | 19 | 21 | Source Sans 3 / 700 | 1.1 | +1% | Every button |
| Heading | 24 | 28 | Fraunces / 700 | 1.15 | -1% | Panel headings, questions being asked |
| Title | 32 | 40 | Fraunces / 800 | 1.05 | -2% | Screen titles, "Your Turn", answers |
| Hero | 48 | 64 | Fraunces / 900 | 1.0 | -3% | Wordmark, big score, "You win" |

- **Minimum readable size:** 14pt on phone, 16pt on tablet. Nothing in play is
  smaller, including card names (Body: 17 / 19).
- **Tablet** is 768pt wide and up.

---

## 5. Shape language

**Corner philosophy: "photo print."** Everything is a print or a piece of
paper, so corners are a crisp **4pt** radius. Avatars are the only round
shapes; they're the round photo stickers families put on album pages.
No pills, no 16px rounded cards.

| Thing | Radius |
|---|---|
| Buttons, panels, cards, inputs, modals, badges | 4pt |
| Dymo label strips | 2pt |
| Avatars | 50% (circle) |

**Photo corners:** cards, the mystery person and the reveal prints have black
photo corners: Cover Brown right triangles with 14pt legs on phone and 18pt on
tablet, at the top-left and bottom-right.

**Outline:** 2pt solid Cover Brown `#3A2A1F` on buttons, inputs and modals;
1pt Rule `#D9C7A6` on cards and list rows.

**Depth: layered paper** (the only depth treatment). A hard offset of 0 × 3pt
in Shadow Paper `#CDB892`, with no blur and no transparency. Pressed buttons
drop to 0 × 1pt. Modals sit at 0 × 6pt. No soft shadows, no blur, and no
frosted glass anywhere.

---

## 6. Spacing & layout

**Grid:** 4pt base. Tokens: **4 / 8 / 12 / 16 / 24 / 32 / 48**. Nothing else.

**Safe areas:** every screen pads by `env(safe-area-inset-*)` plus 16pt at the
sides; the bottom bar sits above the home indicator.

**Thumb zone**
- **Phone portrait:** the screen's one primary action sits in the bottom third,
  above the tab bar, full width minus 16pt each side, 56pt tall.
- **Phone landscape:** the board fills the left, actions stack at the lower
  right.
- **Tablet:** the board on the right two-thirds; the turn panel on the left
  third with its primary action at the lower left, where the left thumb rests.

**Touch targets:** minimum **48×48pt** (the stricter of the iOS and Android
rules), with **8pt** between targets. Primary buttons are 56pt tall.

**Layouts**
- **Phone portrait (320–430pt wide):** single column, 4×6 board.
- **Phone landscape:** board left (6×4), turn panel right.
- **Tablet portrait (768pt+):** turn panel on top, 4×6 board with larger
  prints, notes beside the scorecard.
- **Tablet landscape:** turn panel left third, 6×4 board right two-thirds,
  all 24 prints visible without scrolling.
- Tablets get bigger prints and side-by-side panels, never wider buttons
  (max 360pt).

---

## 7. Iconography

**Style: "inked in the margin."** Drawn on a 24pt grid, 2.25pt stroke, round
caps and joins, outlined with one flat fill of a palette color where it adds
meaning (the heart is filled Hutch Orange). Slightly loose, like they were
drawn with a felt-tip pen next to a photo.

**Set (all custom SVG):** home (album), trophy (ribbon rosette), settings
(pencil), back (left arrow), lock, eye, bell (nudge), target (guess), wand
(flip the rest), heart, camera, microphone, play, pause, check, cross,
warning, couch, link, gift, chevron, close.

**Hero icons** get extra detail and their own motion:
- **Heart** (thinking of you): two-tone, with a beat animation on send.
- **Ribbon rosette** (wins): gold-leaf fill, a shine sweep when a win is
  counted.

**Banned:** emoji as UI icons (the tab bar, buttons, logo, headers and the gift
note all lose theirs), SF Symbols, Material icons and mixed sets. Emoji are
fine inside **messages people write** (taunts, notes); that's their content,
not our UI.

---

## 8. Motion & game feel

**Timing tokens**

| Token | Duration | Used for |
|---|---|---|
| `micro` | 100ms | Button press, chip tap, toggles |
| `standard` | 220ms | Card flip, panel in/out, screen change |
| `celebrate` | 600ms | Win reveal, heart received, score count-up |

**Easing**

| Token | Curve | Used for |
|---|---|---|
| `snap` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button release, chip select (springy overshoot) |
| `settle` | `cubic-bezier(0.22, 1.12, 0.36, 1)` | Panels and modals landing (weighty, small overshoot) |
| `press` | `cubic-bezier(0.4, 0, 0.6, 1)` | Press-down (quick, no overshoot) |

**Every button:** press scales to 0.96 and drops the paper offset to 1pt
(`micro`, `press`); release springs back (`standard`, `snap`); disabled is 40%
opacity, no offset and a "not now" cursor.

**Card flip:** the print turns face-down with a 3D flip around its bottom edge
(`standard`, `settle`), showing the album-page back pattern, plus a strike
through the name so it doesn't rely on dimming alone.

**Big moments:**
- **Win:** the score counts up over `celebrate`; a burst of paper confetti in
  Hutch Orange, Avocado, Gold Leaf and the two player colors; one gentle 2%
  screen pulse.
- **Heart received:** the sender's avatar drops in, the heart beats twice.

**Routine moments stay quiet:** no motion for tab changes, typing or scrolling.

**Reduce Motion:** flips become cross-fades, confetti and pulses are skipped,
and count-ups jump straight to the final number.

---

## 9. Sound & haptics

**Sound palette** (the album world), synthesized in-browser, all under 200ms
except reward:

| Event | Sound |
|---|---|
| Tap | Soft paper tick |
| Back | Page turning back |
| Confirm (send, deal) | Polaroid shutter click |
| Card flip | Print set down on paper |
| Error | Dull wooden knock |
| Reward (win, heart) | Three-note music-box chime, 600ms |

Sound is **on** by default with a toggle in Settings, and follows the phone's
silent switch.

**Haptics**

| Strength | When |
|---|---|
| Light | Taps, chips, card flips |
| Medium | Confirms: ask, answer, deal, send a heart |
| Success pattern | Correct guess, heart received |
| Error pattern | Wrong guess, failed send |

> **Honest limit:** iPhone web apps can't trigger true haptics; Safari ignores
> the vibration API. Android phones get the full map. On iPhone, sound and
> motion carry the feedback.

---

## 10. Voice & copy

**Voice:** a family member talking at the kitchen table. Plain, warm, a little
teasing. Short sentences. Names over pronouns.

**In-world words**

| Generic | Ours |
|---|---|
| New game / Deal | **Open the Album** |
| Card / Board | **Photo / Album** |
| Flip down | **Turn Over** (button) / "turned over" |
| Secret person | **Your Mystery Face** |
| Make a guess | **Name Them** |
| Leaderboard | **Bragging Rights** |
| Settings | **The Back Pages** |
| Give up | **Close the Album** |
| Send a heart | **Send Love** |

**Rules**
- Buttons are verbs: "Ask", "Name Them", "Turn Over the Rest", "Send Love".
- One exclamation point per screen at most, and only for a win.
- Errors say what happened and what to do: "Couldn't reach the album. Check
  your Wi-Fi, then try again."
- **Banned:** "Let's go!", "Awesome!", "Oops! Something went wrong",
  "Unlock…", "Level up…", "Let's play", and anything that could appear in any
  app.

---

## 11. AI-slop audit of the current UI

What the current build does that this brand removes:

| Found today | Replaced by |
|---|---|
| Frosted-glass top bar, tab bar, modals and toasts (4 blur effects) | Solid Kraft and Print White paper, layered-paper offset |
| Soft blurry box-shadows (5) | One hard paper offset |
| 10 different corner radii (5 to 22.5%) | 4pt everywhere, circles for avatars only |
| 23 different font sizes | 7-step type scale |
| System font everywhere | Fraunces + Source Sans 3 |
| Emoji in the logo (🎄/❓), gift note (🎁), tab bar and buttons | Custom inked icon set |
| Generic iOS grouped lists that look like Settings | Album pages, prints and Dymo labels |
| Pill chips and badges competing for attention | Dymo strips for labels, chips only for quick questions |
| "Christmas Edition" candy-cane stripe | Seasonal page: paper-snowflake cutouts and a holly photo corner (Avocado + Hutch Orange) |

---

## 12. Tokens file

All of the above becomes `guess-who/tokens.css` (CSS custom properties) before
any screen is rebuilt. `style.css` may only reference tokens.
