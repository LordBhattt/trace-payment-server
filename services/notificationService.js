// services/notificationService.js
const admin = require("firebase-admin");

// Initialize Firebase Admin (put your service account JSON in root)
// Download from Firebase Console > Project Settings > Service Accounts
try {
  const serviceAccount = require("../firebase-service-account.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.warn("⚠️ Firebase Admin not initialized:", err.message);
}

/**
 * Send notification to a single device
 */
async function sendNotification(token, title, body, data = {}) {
  if (!token) {
    console.warn("No FCM token provided");
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
    console.log("✅ Notification sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Notification error:", error);
    return null;
  }
}

/**
 * Send notification to multiple devices
 */
async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.warn("No FCM tokens provided");
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
    console.log(`✅ Sent to ${response.successCount}/${tokens.length} devices`);
    return response;
  } catch (error) {
    console.error("❌ Multicast notification error:", error);
    return null;
  }
}

module.exports = {
  sendNotification,
  sendMulticastNotification,
};