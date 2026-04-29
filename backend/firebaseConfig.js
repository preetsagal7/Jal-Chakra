const admin = require("firebase-admin");
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

let db = null;

if (fs.existsSync(keyPath)) {
  try {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("🔥 Firebase Firestore connected successfully.");
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.log("⚠️ Firebase skipped: 'serviceAccountKey.json' not found. Reports will only save locally.");
}

module.exports = db;
