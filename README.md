# Us · Jokers 🃏

A tiny private app for two people. Give each other **jokers** (a favor on a joker
card you can cash in later), collect **date ideas**, and keep a shared **bucket
list** — with a history of who added what. Apple-glossy dark mode.

Built for **Rob** and **Astrid**. Pure static HTML/CSS/JS — deploys on GitHub Pages.

---

## Run it locally

ES modules need a server (opening `index.html` directly won't work). From this folder:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

It works immediately in **demo mode** (saves only on the current device).

---

## Deploy on GitHub Pages

1. Create a repo and push these files (or just upload them in the GitHub web UI).
2. Repo **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`. Save.
4. Wait ~1 min. Your site is live at `https://<you>.github.io/<repo>/`.

Add it to your phone home screen (Share → Add to Home Screen) for an app feel.

---

## Make it sync across phones + laptops (Firebase — free, ~5 min)

Demo mode only saves on one device. To let Rob and Astrid share the **same data
everywhere**, plug in Firebase Firestore:

1. Go to <https://console.firebase.google.com> → **Add project** (free, skip Analytics).
2. Left menu **Build → Firestore Database → Create database** → **Start in test mode**
   → pick a location → Enable.
3. **Important — make access permanent.** Test mode stops working after 30 days.
   Go to the **Rules** tab and replace everything with the rule below, then **Publish**.
   This never expires; anyone with your config can read/write (that's what you want).

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

4. Project **Settings (gear) → General → Your apps → Web (`</>`)** → register an app →
   copy the `firebaseConfig` values.
5. Open `js/firebase-config.js`, paste the values, and set `ENABLED = true`.
6. Push to GitHub. Both of you now share one synced deck — no expiry.

---

## Files

| File | What it does |
|------|--------------|
| `index.html` | Markup: login gate, tabs, sheets |
| `css/styles.css` | All the dark glossy styling + animations |
| `js/app.js` | UI logic: jokers, lists, history, confetti |
| `js/store.js` | Data layer — Firestore or localStorage, same API |
| `js/firebase-config.js` | Your Firebase keys (edit this) |

---

## Customize

- **Names/colors:** edit `USERS` in `js/app.js` and `--rob` / `--astrid` in `css/styles.css`.
- **Tabs:** each `.view` section in `index.html` + matching `.tab` button.
