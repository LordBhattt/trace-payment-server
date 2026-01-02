// services/notificationService.js
const admin = require("firebase-admin");

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

  if (
    FIREBASE_PROJECT_ID &&
    FIREBASE_CLIENT_EMAIL &&
    FIREBASE_PRIVATE_KEY
  ) {
    // ✅ Production / Render / CI
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
    // 🧪 Local development fallback
    const serviceAccount = require("../firebase-service-account.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized using local service account");
  }
} catch (err) {
  console.warn("⚠️ Firebase Admin not initialized:", err.message);
  console.log("🚫 Push notifications will be disabled");
}

/* -----------------------------------------
   SEND SINGLE DEVICE NOTIFICATION
----------------------------------------- */
async function sendNotification(token, title, body, data = {}) {
  if (!token) {
    console.warn("⚠️ No FCM token provided");
    return null;
  }

  if (!firebaseInitialized) {
    console.warn("📱 [MOCK] Notification skipped (Firebase not initialized)", {
      title,
      body,
    });
    return null;
  }

  const message = {
    token,
    notification: {
      title,
      body,
    },
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
    const response = await admin.messaging().send(message);
    console.log("📲 Notification sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Notification error:", error.message);
    return null;
  }
}

/* -----------------------------------------
   SEND MULTICAST NOTIFICATION
----------------------------------------- */
async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.warn("⚠️ No FCM tokens provided");
    return null;
  }

  if (!firebaseInitialized) {
    console.warn(
      "📱 [MOCK] Multicast notification skipped",
      tokens.length,
      "devices"
    );
    return null;
  }

  const message = {
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    android: {
      priority: "high",
    },
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(
      `📲 Sent to ${response.successCount}/${tokens.length} devices`
    );
    return response;
  } catch (error) {
    console.error("❌ Multicast notification error:", error.message);
    return null;
  }
}

module.exports = {
  sendNotification,
  sendMulticastNotification,
};
