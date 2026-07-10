const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../readchill-go-backend/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateCollections() {
  console.log('Starting collection migration: mangas -> webtoons');
  const sourceRef = db.collection('mangas');
  const destRef = db.collection('webtoons');
  
  const snapshot = await sourceRef.get();

  if (snapshot.empty) {
    console.log('No matching documents in mangas collection.');
    return;
  }

  console.log(`Found ${snapshot.size} documents to migrate.`);
  
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const newDocRef = destRef.doc(doc.id);
    batch.set(newDocRef, data);
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${count} copies`);
      batch = db.batch();
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
    console.log(`Committed remaining copies. Total copied: ${count}`);
  }

  console.log('Now migrating subcollections (chapters)...');
  count = 0;
  batch = db.batch();
  
  for (const doc of snapshot.docs) {
    const chaptersSnap = await doc.ref.collection('chapters').get();
    for (const chap of chaptersSnap.docs) {
       const newChapRef = destRef.doc(doc.id).collection('chapters').doc(chap.id);
       batch.set(newChapRef, chap.data());
       count++;
       if (count % 400 === 0) {
          await batch.commit();
          console.log(`Committed ${count} chapter copies`);
          batch = db.batch();
       }
    }
  }
  if (count % 400 !== 0) {
      await batch.commit();
      console.log(`Committed remaining chapters. Total chapters: ${count}`);
  }

  console.log('Collection migration completed successfully.');
}

migrateCollections().catch(console.error);
