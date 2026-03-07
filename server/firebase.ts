/**
 * Firebase Configuration (Server-side initialization)
 *
 * This module initializes the Firebase client SDK for server-side use.
 * For client-side usage, see client/src/lib/firebase/ instead.
 *
 * Setup:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create or select a project
 * 3. Copy your web app config to the FIREBASE_* env vars
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

function getFirebaseConfig() {
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  return !!(process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;

  if (!app) {
    app = initializeApp(getFirebaseConfig());
    console.log("[Firebase] Initialized successfully");
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!firestore) {
    firestore = getFirestore(firebaseApp);
  }
  return firestore;
}
