# Firebase Google Authentication Setup

## Backend Setup (NestJS)

### 1. Firebase Project Setup

1. যান [Firebase Console](https://console.firebase.google.com/)
2. একটা নতুন প্রজেক্ট তৈরি করুন বা existing প্রজেক্ট select করুন
3. **Project Settings** → **Service Accounts** এ যান
4. **Generate New Private Key** এ click করুন
5. JSON file download হবে

### 2. Environment Variables Setup

আপনার `.env` ফাইলে এই variables গুলো add করুন:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**Note:** `FIREBASE_PRIVATE_KEY` এ `\n` characters থাকলে সেটা quotes এর মধ্যে রাখুন।

### 3. API Endpoint

**Endpoint:** `POST /api/auth/firebase/google`

**Request Body:**

```json
{
  "idToken": "firebase-id-token-from-frontend",
  "fcm_token": "optional-fcm-token-for-push-notifications"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged in successfully via Firebase",
  "authorization": {
    "type": "bearer",
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token"
  },
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "avatar": "profile-picture-url",
    "type": "user-type"
  }
}
```

---

## Frontend Setup (React Native / Web)

### 1. Install Firebase

```bash
npm install firebase
# or
yarn add firebase
```

### 2. Firebase Configuration

```javascript
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
```

### 3. Implementation Example (Web)

```javascript
import { auth, googleProvider } from "./firebase-config";
import { signInWithPopup } from "firebase/auth";
import axios from "axios";

const handleGoogleLogin = async () => {
  try {
    // Sign in with Google
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Get Firebase ID token
    const idToken = await user.getIdToken();

    // Send to backend
    const response = await axios.post(
      "http://your-api-url/api/auth/firebase/google",
      {
        idToken: idToken,
        fcm_token: "optional-fcm-token", // if you have push notifications
      },
    );

    console.log("Login success:", response.data);

    // Store tokens in localStorage or secure storage
    localStorage.setItem(
      "access_token",
      response.data.authorization.access_token,
    );
    localStorage.setItem(
      "refresh_token",
      response.data.authorization.refresh_token,
    );

    // Redirect to dashboard or home page
    window.location.href = "/dashboard";
  } catch (error) {
    console.error("Login error:", error);
  }
};
```

### 4. Implementation Example (React Native)

```javascript
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import axios from "axios";

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: "your-web-client-id.apps.googleusercontent.com",
});

const handleGoogleLogin = async () => {
  try {
    // Get Google user info
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();

    // Send to backend
    const response = await axios.post(
      "http://your-api-url/api/auth/firebase/google",
      {
        idToken: idToken,
        fcm_token: "optional-fcm-token",
      },
    );

    console.log("Login success:", response.data);

    // Store tokens securely
    await AsyncStorage.setItem(
      "access_token",
      response.data.authorization.access_token,
    );
    await AsyncStorage.setItem(
      "refresh_token",
      response.data.authorization.refresh_token,
    );
  } catch (error) {
    console.error("Login error:", error);
  }
};
```

### 5. Complete React Component Example

```jsx
import React, { useState } from "react";
import { auth, googleProvider } from "./firebase-config";
import { signInWithPopup } from "firebase/auth";
import axios from "axios";

function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Firebase Google Sign In
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send to backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/firebase/google`,
        { idToken },
      );

      if (response.data.success) {
        // Store tokens
        localStorage.setItem(
          "access_token",
          response.data.authorization.access_token,
        );
        localStorage.setItem(
          "refresh_token",
          response.data.authorization.refresh_token,
        );
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Redirect or update state
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#4285f4",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "16px",
        }}
      >
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default GoogleLoginButton;
```

---

## Testing

### Postman Test

1. Frontend থেকে Firebase ID token নিন
2. Postman এ POST request করুন:

```
POST http://localhost:5005/api/auth/firebase/google
Content-Type: application/json

{
  "idToken": "your-firebase-id-token-here"
}
```

---

## Security Notes

1. **Never** commit `.env` file to git
2. Private key সবসময় secure রাখুন
3. Frontend এ API key public থাকলেও কোন সমস্যা নেই, Firebase security rules দিয়ে protect করা
4. Backend validation Firebase Admin SDK দিয়ে হয়, তাই secure

---

## Troubleshooting

### Error: "Failed to parse private key"

- `.env` ফাইলে private key properly escaped করুন
- `\n` characters quotes এর মধ্যে থাকতে হবে

### Error: "Firebase app not initialized"

- `main.ts` এ `initializeFirebase()` call করা আছে কিনা check করুন
- Environment variables সঠিক আছে কিনা verify করুন

### Error: "Email not found in token"

- Firebase console এ email scope enabled আছে কিনা check করুন
- Google provider properly configured আছে কিনা verify করুন

---

## Additional Features

- ✅ Automatic user creation if not exists
- ✅ Stripe customer creation
- ✅ JWT token generation
- ✅ Refresh token support
- ✅ FCM token storage for push notifications
- ✅ Email verification bypass (Google already verified)
