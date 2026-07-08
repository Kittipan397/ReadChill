const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// GET /api/v1/mangas - Get all mangas
router.get('/', async (req, res, next) => {
    try {
        const snapshot = await db.collection('mangas').orderBy('views', 'desc').get();
        const mangas = [];
        snapshot.forEach(doc => {
            mangas.push({ id: doc.id, ...doc.data() });
        });
        res.json({ success: true, data: mangas });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/mangas/:id - Get manga detail and its chapters
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const mangaRef = db.collection('mangas').doc(id);
        const doc = await mangaRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Manga not found' });
        }

        const mangaData = { id: doc.id, ...doc.data() };

        // Fetch chapters subcollection
        const chaptersSnapshot = await mangaRef.collection('chapters').orderBy('number', 'asc').get();
        const chapters = [];
        chaptersSnapshot.forEach(cDoc => {
            chapters.push({ id: cDoc.id, ...cDoc.data() });
        });

        mangaData.chapters = chapters;

        res.json({ success: true, data: mangaData });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/mangas/:id/chapters/:chapterId - Get reader images
router.get('/:id/chapters/:chapterId', async (req, res, next) => {
    try {
        const { id, chapterId } = req.params;
        const chapterRef = db.collection('mangas').doc(id).collection('chapters').doc(chapterId);
        const doc = await chapterRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Chapter not found' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
