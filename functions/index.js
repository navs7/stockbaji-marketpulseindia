/**
 * BLAZE-READY SCAFFOLD. Not deployed on the Spark plan.
 * Scheduled Functions, Cloud Messaging and outbound network calls all require the Blaze plan.
 *
 * To enable:
 *   1. Upgrade the project to Blaze (set a budget alert).
 *   2. Add "functions": { "source": "functions" } to firebase.json.
 *   3. cd functions && npm install && cd .. && firebase deploy --only functions
 *   4. In the web app, request FCM tokens and store them on users/{uid}.fcmTokens (see README).
 *
 * dispatchDueReminders: every minute, find users with reminders due now and push via FCM.
 * The planning rules live in src/lib/engine.js; port them (or share the module) so the server
 * and the client agree on what is due, quiet hours, snooze and rate limits.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const MAX_INSTANT_PUSHES = 20;

exports.dispatchDueReminders = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Asia/Kolkata' }, async () => {
  const nowIso = new Date().toISOString();
  // Expect a denormalised collection written by the planner: dueReminders/{id} { uid, title, body, link, dueAt, priority, sent }
  const due = await db.collection('dueReminders').where('sent', '==', false).where('dueAt', '<=', nowIso).limit(500).get();
  const byUser = new Map();
  due.docs.forEach((d) => { const r = d.data(); (byUser.get(r.uid) || byUser.set(r.uid, []).get(r.uid)).push({ ref: d.ref, ...r }); });

  for (const [uid, items] of byUser) {
    const user = (await db.doc(`users/${uid}`).get()).data();
    const tokens = user?.fcmTokens || [];
    const sentToday = user?.pushesToday || 0;
    let budget = Math.max(0, MAX_INSTANT_PUSHES - sentToday);
    for (const it of items) {
      const high = it.priority === 'High';
      if (!tokens.length || (budget <= 0 && !high)) continue; // overflow waits for the digest
      await admin.messaging().sendEachForMulticast({
        tokens,
        data: { id: it.ref.id, title: it.title.slice(0, 65), body: it.body || '', url: it.link || '/reminders' },
        webpush: { fcmOptions: { link: it.link || '/reminders' } },
      });
      await it.ref.update({ sent: true });
      if (!high) budget--;
    }
  }
});
