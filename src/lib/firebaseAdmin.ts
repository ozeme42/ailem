import * as admin from 'firebase-admin';

// This file is for server-side operations ONLY.
// It initializes the Firebase Admin SDK.

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // Make sure your Storage Bucket URL is available as an environment variable
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export default admin;
