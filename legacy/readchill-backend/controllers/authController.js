const { db } = require('../config/firebase');

// Get user profile (Requires Auth Token)
const getUserProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found in Firestore' });
        }

        res.status(200).json({
            data: {
                id: userDoc.id,
                ...userDoc.data()
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getUserProfile
};
