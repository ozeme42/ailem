import * as admin from 'firebase-admin';

// This file is for server-side operations ONLY.
// It initializes the Firebase Admin SDK.

let app: admin.app.App;

export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    // In a Google Cloud environment like App Hosting, credentials are automatically discovered.
    // This is the recommended approach over using a service account JSON file.
    // The service account used by App Hosting needs "Storage Admin" IAM role for this to work.
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
    throw new Error('Could not initialize Firebase Admin SDK. Ensure the service account has necessary permissions.');
  }

  return admin;
}
