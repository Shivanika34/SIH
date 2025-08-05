const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.cleanupOldAlerts = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async () => {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    const db = admin.firestore();
    const snapshot = await db.collection("alerts")
      .where("timestamp", "<", new Date(cutoff))
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
