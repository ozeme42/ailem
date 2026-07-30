import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config - values are hardcoded to ensure they are available in release builds
// where EXPO_PUBLIC_* env vars may not be embedded correctly via Gradle
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCvz2ukMyhGT_JfAf-vD5GEZsUxIcu0qpY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "ailem-app.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "ailem-app",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "ailem-app.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "593836409742",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:593836409742:web:8df95255db34891b82dadf",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Use getReactNativePersistence to ensure Auth state is persisted correctly on mobile
let auth: Auth;
try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (error) {
    // Auth might already be initialized if hot-reloading
    const { getAuth } = require("firebase/auth");
    auth = getAuth(app);
}

const storage = getStorage(app);

export { app, db, auth, storage };
