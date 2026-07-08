const admin = require("firebase-admin");

// Initialize with default credentials but specific project ID
admin.initializeApp({ projectId: "readchill" });
const db = admin.firestore();

async function check() {
    try {
        const snap = await db.collection("users").where("email", "==", "kittipan.g397@gmail.com").get();
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`User: ${data.email} | Coins: ${data.coins} | Role: ${data.role}`);
        });
    } catch(e) {
        console.error(e);
    }
}

check().then(() => process.exit(0));
