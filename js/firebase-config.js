// ============================================================
//  FIREBASE CONFIG  —  fill this in to sync across phones/laptops
// ============================================================
//
//  Until you fill this in, the app runs in DEMO mode and saves only
//  on THIS device/browser (localStorage). That's fine for trying it out.
//
//  To make Rob + Astrid share the same data everywhere:
//   1. Go to  https://console.firebase.google.com  -> Add project (free).
//   2. In the project: build > Firestore Database > Create database
//      -> Start in *test mode* (or paste the rules from README.md).
//   3. Project settings (gear icon) > "Your apps" > Web app (</> icon)
//      -> register an app -> copy the firebaseConfig values below.
//   4. Paste them here, save, push to GitHub. Done.
//
//  Leave ENABLED = false to force demo mode even with config present.
// ============================================================

export const ENABLED = false;

export const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE",
};
