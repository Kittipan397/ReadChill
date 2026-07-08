const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

let db;

// Initialize Firebase Admin SDK
try {
    const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

    // Check if the service account is still a placeholder
    if (serviceAccount.project_id === 'YOUR_PROJECT_ID') {
        console.warn('⚠️ WARNING: serviceAccountKey.json is still using placeholder data!');
        console.warn('Please generate a real Service Account key from Firebase Console.');
    }

    const app = initializeApp({
        credential: cert(serviceAccount)
    });
    
    db = getFirestore(app);
    console.log('Firebase Admin initialized successfully.');
} catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    console.error('Please ensure serviceAccountKey.json exists in the readchill-backend root folder.');
}

module.exports = { db };
