import * as admin from 'firebase-admin';

// This file is for server-side operations ONLY.
// It initializes the Firebase Admin SDK.

let app: admin.app.App;

export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    let credential;
    if (process.env.FIREBASE_ADMIN_CREDENTIALS_JSON) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS_JSON));
    } else {
      // Fallback for local development without the env var
      credential = admin.credential.applicationDefault();
    }

    app = admin.initializeApp({
      credential,
      // Make sure your Storage Bucket URL is available as an environment variable
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
    throw new Error('Could not initialize Firebase Admin SDK.');
  }

  return admin;
}
