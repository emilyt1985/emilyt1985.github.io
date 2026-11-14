# Guess Who? Family Edition

A two-player Guess Who game for phones. It's a plain web app hosted on GitHub Pages; no app store needed.

**Play at:** https://emilyt1985.github.io/guess-who/

## How a game works (asynchronous)

1. Someone taps **Deal the cards**. Each player gets a random secret person from the same 24-card board (4 × 6). Last game's loser goes first.
2. On your turn you **ask** a yes/no question (type it or tap a quick question).
3. The other player sees the question the next time they open the app and taps **Yes / No / Not sure**. Their secret person is shown right there to help.
4. You see the answer, **tap cards to flip (dim) them**, then **End turn**. You can also **Guess** at any point in your turn.
5. A right guess wins. A wrong guess loses the game by default (set `rules.wrongGuess: 'skip'` in `config.js` for gentler rules).
6. Results go on the **Leaderboard**: wins, this month, streaks, fewest questions to win, and recent games with the stakes.

Use **📣 Nudge** to text the other player that it's their turn. Add each parent's phone number in `config.js` to make it a one-tap text.

## One-time setup: let two phones play from different places (about 10 minutes, free)

The game shares its state through Google Firebase (the free "Spark" plan is plenty).

1. Go to https://console.firebase.google.com → **Add project** (Analytics can be turned off).
2. In the project: **Build → Firestore Database → Create database**. Pick a location and **production mode**.
3. On the **Rules** tab, paste this and click **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /guesswho/{room} {
         allow read, write: if room.size() > 12;
       }
     }
   }
   ```
   (Only the room in `config.js` is ever used. A long, random `roomCode` acts as the password.)
4. **Project settings (⚙️) → General → Your apps → Web (`</>`)**. Register an app (no hosting needed) and copy the `firebaseConfig` values.
5. In `guess-who/config.js`, paste them into `firebase: { ... }` and change `roomCode` to something long and random.
6. Commit and push. GitHub Pages updates within a minute or two.

Until Firebase is set up, the app runs in **local test mode**: everything works, but only on one device (open two tabs, one `?me=valerie` and one `?me=bobby`, to try both sides).

## Get it on your parents' phones

- In the app, go to **Settings → Personal links** and send Valerie her link and Bobby his. Each link signs them in as the right player.
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**.
- **Android:** open it in Chrome → ⋮ → **Add to Home screen**.

## Personalize

Everything lives in `config.js`:

| What | Where |
|---|---|
| Names, nicknames, emoji, colors, phone numbers | `players` |
| Real photos of family and friends | put images in `guess-who/photos/`, then `photo: 'photos/aunt-linda.jpg'` on a person |
| Memory or inside joke shown at the reveal | `fact` on each person |
| More than 24 people (each game draws a fresh 24) | add more entries to a deck |
| Family inside-joke questions | `quickQuestions` |
| Trash talk buttons | `taunts` |
| Win messages in each parent's voice | `winMessages` |
| Anniversary and birthday banners | `specialDates` |
| Stakes suggestions | `stakesIdeas` |

Square-ish photos work best, cropped to head and shoulders, about 400 px wide.

## Files

- `index.html`: page shell (installable as a home-screen app via `manifest.json` and `sw.js`)
- `app.js`: game rules and screens
- `store.js`: syncing (Firebase online, localStorage offline)
- `faces.js`: draws the placeholder cartoon faces
- `config.js`: everything personal
