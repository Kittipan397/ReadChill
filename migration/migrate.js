const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../readchill-go-backend/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrate() {
  console.log('Starting migration to copy mangas to webtoons...');
  const mangasRef = db.collection('mangas');
  const webtoonsRef = db.collection('webtoons');
  const snapshot = await mangasRef.get();

  if (snapshot.empty) {
    console.log('No matching documents in mangas.');
    return;
  }

  console.log(`Found ${snapshot.size} mangas to migrate.`);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.type === 'manga' || data.type === 'comic') {
      data.type = 'webtoon';
    }
    
    // Copy the main document
    await webtoonsRef.doc(doc.id).set(data);
    console.log(`Copied ${doc.id}`);

    // Now copy the chapters subcollection
    const chaptersSnapshot = await doc.ref.collection('chapters').get();
    if (!chaptersSnapshot.empty) {
      let batch = db.batch();
      let count = 0;
      for (const chapterDoc of chaptersSnapshot.docs) {
        batch.set(webtoonsRef.doc(doc.id).collection('chapters').doc(chapterDoc.id), chapterDoc.data());
        count++;
        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
      console.log(`  - Copied ${chaptersSnapshot.size} chapters for ${doc.id}`);
    }
  }

  console.log('Migration completed successfully.');
}

migrate().catch(console.error);
