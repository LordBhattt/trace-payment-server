// services/notificationService.js
const admin = require("firebase-admin");

// Initialize Firebase Admin
try {
  let serviceAccount;
  
  // Check if running on Render (production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("📱 Using Firebase credentials from environment variable");
  } else {
    // Local development - use file
    serviceAccount = require("../firebase-service-account.json");
    console.log("📱 Using Firebase credentials from local file");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
} catch (err) {
  console.warn("⚠️ Firebase Admin not initialized:", err.message);
  console.log("Push notifications will be disabled");
}

/**
 * Send notification to a single device
 */
async function sendNotification(token, title, body, data = {}) {
  if (!token) {
    console.warn("No FCM token provided");
    return null;
  }

  // Check if Firebase is initialized
  if (!admin.apps.length) {
    console.warn("📱 [MOCK] Would send notification:", { token, title, body });
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

  // Check if Firebase is initialized
  if (!admin.apps.length) {
    console.warn("📱 [MOCK] Would send multicast notification to", tokens.length, "devices");
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