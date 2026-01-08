import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
// You need to add your Firebase service account key
// Download it from Firebase Console -> Project Settings -> Service Accounts
// and place it in your project root or use environment variables

const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      // Option 1: Using service account JSON file
      // admin.initializeApp({
      //   credential: admin.credential.cert('./firebase-service-account.json'),
      // });

      // Option 2: Using environment variables (recommended for production)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

      console.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
      console.error("Firebase Admin SDK initialization error:", error);
    }
  }
};

export default initializeFirebase;
