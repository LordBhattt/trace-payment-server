// services/notificationService.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let firebaseInitialized = false;

/* -----------------------------------------
   FIREBASE ADMIN INITIALIZATION
----------------------------------------- */
try {
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  // ✅ OPTION 1: ENV VARIABLES (Render / Production)
  if (
    FIREBASE_PROJECT_ID &&
    FIREBASE_CLIENT_EMAIL &&
    FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized using ENV credentials");

  } else {
    // ✅ OPTION 2: Local file (ONLY if it exists)
    const serviceAccountPath = path.join(
      __dirname,
      "../firebase-service-account.json"
    );

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      firebaseInitialized = true;
      console.log("✅ Firebase Admin initialized using local service account");

    } else {
      console.warn(
        "⚠️ Firebase credentials not found (env or local file). Notifications disabled."
      );
    }
  }
} catch (err) {
  console.warn("⚠️ Firebase Admin initialization failed:", err.message);
}

/* -----------------------------------------
   SEND SINGLE DEVICE NOTIFICATION
----------------------------------------- */
async function sendNotification(token, title, body, data = {}) {
  if (!token) return null;

  if (!firebaseInitialized) {
    console.warn("📱 [MOCK] Notification skipped:", title);
    return null;
  }

  const message = {
    token,
    notification: { title, body },
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "trace_rides",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    return await admin.messaging().send(message);
  } catch (err) {
    console.error("❌ Notification error:", err.message);
    return null;
  }
}

/* -----------------------------------------
   SEND MULTICAST NOTIFICATION
----------------------------------------- */
async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return null;

  if (!firebaseInitialized) {
    console.warn(
      "📱 [MOCK] Multicast notification skipped:",
      tokens.length,
      "devices"
    );
    return null;
  }

  const message = {
    tokens,
    notification: { title, body },
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    android: { priority: "high" },
  };

  try {
    return await admin.messaging().sendMulticast(message);
  } catch (err) {
    console.error("❌ Multicast notification error:", err.message);
    return null;
  }
}

module.exports = {
  sendNotification,
  sendMulticastNotification,
};
