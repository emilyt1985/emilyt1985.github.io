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
| Family members on the cards | `FAMILY` (described by hair, glasses, caps and so on; see below) |
| Memory or inside joke shown at the reveal | `fact` on each person |
| Player avatars (Valerie and Bobby) | `photo:` on each player, currently their Memoji in `guess-who/avatars/` |
| Family inside-joke questions | `quickQuestions` |
| Trash talk buttons | `taunts` |
| Win messages in each parent's voice | `winMessages` |
| Anniversary and birthday banners | `specialDates` |
| Stakes suggestions | `stakesIdeas` |

### Adding a family member

Family members are drawn as cartoons from a short description in `FAMILY` in `config.js`, for example:

```js
{ name: 'Sadie', skin: 0, hair: 'lightbrown', style: 'curly', eyes: 'blue', shirt: 'lightblue', fact: '' },
```

All the options (hair colors and styles, glasses, caps, beards, earrings, kids...) are listed at the top of `faces.js`. Everyone in `FAMILY` is dealt in every game; placeholder people fill the rest of the 24 spots.

To use a picture instead of a drawing (a Memoji, say), save it in `guess-who/memoji/` and add `photo: 'memoji/name.webp'` to that person. Cartoons and Memoji are fine on a public site. Real photos of family (especially kids) shouldn't go in this public repository.

## Thinking of you and family notes

- **Thinking of you:** the home screen has a big "Send a heart" button and quick messages ("Miss you", "Goodnight"). The other person gets a pop-up with the sender's Memoji, plus a "Send One Back" button. Hearts that arrive while the app is closed pop up the next time it's opened. Edit the quick messages in `thinkingOfYou` in `config.js`.
- **Family notes:** relatives open the family link (`ask.html`), choose "A note", and write to Valerie, Bobby or both. Notes appear on the home screen under "From the family", newest first, with arrows to flip through them. A note can include a photo (shrunk to a phone-friendly size) and a voice note up to a minute long; each is stored as its own small entry in Firestore, so no paid Firebase file storage is needed. Hide any note from the review page (`review.html`, Notes tab).

## Family Quiz question box

Relatives send notes and questions for the upcoming Family Quiz game from **ask.html**, no account needed:

- **Send this link to the family:** https://emilyt1985.github.io/guess-who/ask.html
- Each person taps their Memoji (or "Someone else"), picks a kind of question, and writes it:
  - **About me:** a question about themselves, with the right answer and 1–3 wrong ones.
  - **About the family:** the same, about someone or something else.
  - **About each other:** for Valerie and Bobby to answer about each other; no answer key, points if they match.
- An optional note is shown after the question is answered (a memory, "Love you!").

**Review:** https://emilyt1985.github.io/guess-who/review.html shows every question with its answers. Hide anything you don't want used. Don't send this one to Valerie or Bobby: it shows the answers.

Questions are stored in their own Firebase document (`questionsCode` in `config.js`), separate from the game, so the family link can't touch the game. Until Firebase is set up, questions are only saved in the browser that sent them.

## Files

- `index.html`: page shell (installable as a home-screen app via `manifest.json` and `sw.js`)
- `app.js`: game rules and screens
- `store.js`: syncing (Firebase online, localStorage offline)
- `faces.js`: draws the cartoon faces (family and placeholders)
- `config.js`: everything personal
- `ask.html`, `ask.js`: the family question box
- `review.html`, `review.js`: your private review page for submitted questions
