const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const cors = require("cors")({ origin: true });

exports.verifySlipOK = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // We expect the frontend to send: { url: "...", apikey: "..." }
            const payload = req.body;
            
            if (!payload || !payload.url || !payload.apikey) {
                return res.status(400).json({ success: false, message: "Missing url or apikey" });
            }

            // Call SlipOK API
            const slipokRes = await fetch("https://api.slipok.com/api/line/apikey/69617", {
                method: "POST",
                headers: {
                    "x-authorization": payload.apikey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url: payload.url })
            });

            // Even if SlipOK returns 400 Bad Request (like 1001 or 1000), we parse the JSON
            const data = await slipokRes.json();

            // Return to frontend
            res.status(slipokRes.status).json(data);
        } catch (error) {
            console.error("verifySlip error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    });
});

exports.buyChapter = functions.https.onCall(async (data, context) => {
    // 1. เธ•เธฃเธงเธเธชเธญเธเธชเธดเธ—เธเธดเน (เธ•เนเธญเธเธฅเนเธญเธเธญเธดเธ)
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'เธ•เนเธญเธเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเธ—เธณเธฃเธฒเธขเธเธฒเธฃ'
        );
    }

    const userId = context.auth.uid;
    const { mangaId, chapterId, chapterNumber, price, authorId, revenueShare } = data;

    if (!mangaId || !chapterId || price == null || !authorId || revenueShare == null) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'เธเนเธญเธกเธนเธฅเนเธกเนเธเธฃเธเธ–เนเธงเธเธชเธณเธซเธฃเธฑเธเธเธฒเธฃเธเธทเนเธญเธ•เธญเธ'
        );
    }

    const db = require("firebase-admin").firestore();
    const userRef = db.collection("users").doc(userId);
    const authorRef = db.collection("users").doc(authorId);
    
    try {
        // เนเธเน Transaction เน€เธเธทเนเธญเธเธงเธฒเธกเธเธฅเธญเธ”เธ เธฑเธข 100%
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเน');
            }

            const userData = userDoc.data();
            const currentCoins = userData.coins || 0;

            // เธ•เธฃเธงเธเธชเธญเธเธขเธญเธ”เน€เธเธดเธ
            if (currentCoins < price) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'เน€เธซเธฃเธตเธขเธเนเธกเนเน€เธเธตเธขเธเธเธญ'
                );
            }

            // เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเน€เธเธขเธเธทเนเธญเธซเธฃเธทเธญเธขเธฑเธ
            const unlockedChapters = userData.unlockedChapters || [];
            if (unlockedChapters.includes(chapterId)) {
                throw new functions.https.HttpsError(
                    'already-exists',
                    'เธเธธเธ“เนเธ”เนเธเธฅเธ”เธฅเนเธญเธเธ•เธญเธเธเธตเนเนเธเนเธฅเนเธง'
                );
            }

            // เธเธณเธเธงเธ“เธชเนเธงเธเนเธเนเธ
            let authorEarned = 0;
            if (authorId !== "admin") {
                authorEarned = (price * revenueShare) / 100;
            }

            // 1) เธซเธฑเธเน€เธเธดเธเธเธเธเธทเนเธญ + เน€เธเธดเนเธกเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธเธทเนเธญ
            transaction.update(userRef, {
                coins: currentCoins - price,
                unlockedChapters: require("firebase-admin").firestore.FieldValue.arrayUnion(chapterId)
            });

            // 2) เน€เธเธดเนเธกเน€เธเธดเธเธเธฑเธเน€เธเธตเธขเธ
            if (authorId !== "admin") {
                transaction.update(authorRef, {
                    earnedCoins: require("firebase-admin").firestore.FieldValue.increment(authorEarned)
                });
            }

            // 3) เธชเธฃเนเธฒเธเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธ—เธณเธเธธเธฃเธเธฃเธฃเธก (transactions)
            const txRef = db.collection("transactions").doc();
            transaction.set(txRef, {
                userId,
                mangaId,
                chapterId,
                type: "purchase",
                amount: price,
                revenueShare,
                authorEarned,
                partnerId: authorId,
                createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true, message: "เธเธทเนเธญเธ•เธญเธเธชเธณเน€เธฃเนเธ" };

    } catch (error) {
        console.error("buyChapter transaction failed:", error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธ—เธณเธฃเธฒเธขเธเธฒเธฃ'
        );
    }
});

exports.submitTopup = functions.https.onCall(async (data, context) => {
    // 1. เธ•เธฃเธงเธเธชเธญเธเธชเธดเธ—เธเธดเน (เธ•เนเธญเธเธฅเนเธญเธเธญเธดเธ)
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'เธ•เนเธญเธเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเธ—เธณเธฃเธฒเธขเธเธฒเธฃ'
        );
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;
    const { slipUrl, packageBaht, packageCoins } = data;

    if (!slipUrl || !packageBaht || !packageCoins) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'เธเนเธญเธกเธนเธฅเนเธกเนเธเธฃเธเธ–เนเธงเธ'
        );
    }

    const db = admin.firestore();
    const API_KEY = "SLIPOKPHXCCC8"; // เธเธงเธเธเธธเธกเนเธ”เธข Server เน€เธ—เนเธฒเธเธฑเนเธ

    try {
        // 1. เธ•เธฃเธงเธเธชเธญเธเธชเธฅเธดเธเธเธฑเธ SlipOK API
        const slipokRes = await fetch("https://api.slipok.com/api/line/apikey/69617", {
            method: "POST",
            headers: {
                "x-authorization": API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: slipUrl })
        });

        const slipokResult = await slipokRes.json();
        
        if (!slipokResult.success) {
            throw new functions.https.HttpsError('invalid-argument', slipokResult.message || "เธชเธฅเธดเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ เธซเธฃเธทเธญเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ•เธฃเธงเธเธชเธญเธเนเธ”เน");
        }

        const slipData = slipokResult.data;

        // 2. เธ•เธฃเธงเธเธชเธญเธเธขเธญเธ”เน€เธเธดเธ
        if (slipData.amount < packageBaht) {
            throw new functions.https.HttpsError('invalid-argument', `เธขเธญเธ”เน€เธเธดเธเนเธเธชเธฅเธดเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ (เธเธเธขเธญเธ”: ${slipData.amount} เธเธฒเธ—, เธ•เนเธญเธเธเธฒเธฃ: ${packageBaht} เธเธฒเธ—)`);
        }

        // 3. เธ•เธฃเธงเธเธชเธญเธเธเธทเนเธญเธเธนเนเธฃเธฑเธ
        const receiverName = (slipData.receiver.name || "").toUpperCase();
        if (!receiverName.includes("เธเธดเธ•เธ•เธดเธเธฑเธเธเน") && !receiverName.includes("KITTIPAN") && !receiverName.includes("SAPMEE")) {
            throw new functions.https.HttpsError('invalid-argument', `เธเธทเนเธญเธเธฑเธเธเธตเธเธนเนเธฃเธฑเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ (เธเธเธเธทเนเธญ: ${slipData.receiver.name})`);
        }

        // 4. เธ•เธฃเธงเธเธชเธญเธเธงเธฑเธเน€เธงเธฅเธฒ
        if (!slipData.transDate || !slipData.transTime) {
            throw new functions.https.HttpsError('invalid-argument', "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเนเธฒเธเธงเธฑเธเนเธฅเธฐเน€เธงเธฅเธฒเธเธฒเธเธชเธฅเธดเธเนเธ”เน");
        }

        const transRef = slipData.transRef;

        // เนเธเน Transaction เน€เธเธทเนเธญเธเนเธญเธเธเธฑเธเธเธฒเธฃเนเธเนเธชเธฅเธดเธเธเนเธณเนเธฅเธฐเธเธฒเธฃเน€เธเธดเนเธกเน€เธซเธฃเธตเธขเธเธเนเธณ
        const docRefId = await db.runTransaction(async (transaction) => {
            // Check Duplicate
            const qDup = db.collection("payments").where("transRef", "==", transRef);
            const dupSnap = await transaction.get(qDup);
            if (!dupSnap.empty) {
                throw new functions.https.HttpsError('already-exists', "เธชเธฅเธดเธเธเธตเนเธ–เธนเธเนเธเนเธเธฒเธเนเธเนเธฅเนเธง เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธเนเธเนเธณเนเธ”เน!");
            }

            // Create Payment Record
            const paymentRef = db.collection("payments").doc();
            transaction.set(paymentRef, {
                userId: userId,
                userEmail: userEmail,
                bahtAmount: packageBaht,
                coinAmount: packageCoins,
                slipUrl: slipUrl,
                transRef: transRef,
                status: "completed",
                type: "coin_topup",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update Coins
            const userRef = db.collection("users").doc(userId);
            transaction.update(userRef, {
                coins: admin.firestore.FieldValue.increment(packageCoins)
            });

            return paymentRef.id;
        });

        return { success: true, message: "เน€เธ•เธดเธกเน€เธซเธฃเธตเธขเธเธชเธณเน€เธฃเนเธ", docId: docRefId };

    } catch (error) {
        console.error("submitTopup error:", error);
        throw new functions.https.HttpsError(
            error.code || 'internal',
            error.message || 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธ—เธณเธฃเธฒเธขเธเธฒเธฃ'
        );
    }
});

exports.renderMangaPage = functions.https.onRequest(async (req, res) => {
    try {
        const id = req.query.id;
        
        // เธเธณเธซเธเธ”เธเนเธฒ Meta 
        let title = "ReadChill - เธญเนเธฒเธเธกเธฑเธเธเธฐเธเธฃเธต";
        let description = "เนเธซเธฅเนเธเธฃเธงเธกเธกเธฑเธเธเธฐเนเธฅเธฐเธเธญเธกเธกเธดเธเธเธธเธ“เธ เธฒเธ เธญเนเธฒเธเธเธฃเธต เธญเนเธฒเธเน€เธเธฅเธดเธ เนเธ”เนเธ—เธธเธเธ—เธตเนเธ—เธธเธเน€เธงเธฅเธฒ";
        let imageUrl = "https://readchill.web.app/images/logo.png"; 

        if (id) {
            const db = admin.firestore();
            const doc = await db.collection("mangas").doc(id).get();
            if (doc.exists) {
                const data = doc.data();
                title = `${data.title} - เธญเนเธฒเธเธกเธฑเธเธเธฐเธเธ ReadChill`;
                description = data.synopsis || description;
                imageUrl = data.coverUrl || imageUrl;
            }
        }

        // เน€เธเนเธเนเธเธเธเธ CDN (1 เธเธฑเนเธงเนเธกเธ)
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

        // เธ”เธถเธเธซเธเนเธฒ _manga.html เธ—เธตเนเน€เธเนเธเธ•เนเธเธเธเธฑเธ (เนเธเน native fetch เธเธญเธ Node 20)
        let templateRes;
        try {
            templateRes = await globalThis.fetch("https://readchill.web.app/_manga.html");
        } catch(e) {
            console.error("Fetch _manga.html failed:", e);
            throw e;
        }
        
        let templateHtml = await templateRes.text();
        
        // เนเธ—เธฃเธ Meta Tags เธฅเธเนเธเนเธเธชเนเธงเธ <head>
        const metaTags = `
            <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
            <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:url" content="https://readchill.web.app/manga.html?id=${id || ''}" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
        `;
        
        templateHtml = templateHtml.replace('<head>', `<head>${metaTags}`);
        
        return res.status(200).send(templateHtml);
    } catch (error) {
        console.error("renderMangaPage error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Helper function to extract public_id from Cloudinary URL
function getCloudinaryPublicId(url) {
    if (!url) return null;
    try {
        // Example URL: https://res.cloudinary.com/dbx/.../upload/v1234/folder/filename.jpg
        const parts = url.split("/");
        const uploadIndex = parts.findIndex(p => p === "upload");
        if (uploadIndex === -1) return null;
        
        // Everything after upload/v.../ is the public_id + extension
        // e.g. v1234/folder/filename.jpg -> folder/filename.jpg
        // actually v1234 could be optional, but typically it's the next segment after upload that starts with v
        let startIndex = uploadIndex + 1;
        if (parts[startIndex].startsWith("v") && !isNaN(parts[startIndex].substring(1))) {
            startIndex++;
        }
        
        const publicIdWithExtension = parts.slice(startIndex).join("/");
        const lastDotIndex = publicIdWithExtension.lastIndexOf(".");
        if (lastDotIndex === -1) return publicIdWithExtension;
        return publicIdWithExtension.substring(0, lastDotIndex);
    } catch (e) {
        console.error("Error parsing Cloudinary URL:", e);
        return null;
    }
}

// Scheduled function to run every day at midnight (Asia/Bangkok time)
exports.cleanupOldWithdrawals = functions.region("asia-southeast1")
    .pubsub.schedule("0 0 * * *")
    .timeZone("Asia/Bangkok")
    .onRun(async (context) => {
        console.log("Starting cleanup of old withdrawal requests...");
        
        const cloudinary = require("cloudinary").v2;
        // Check if cloudinary is configured
        if (!process.env.CLOUDINARY_URL) {
            console.error("CLOUDINARY_URL environment variable is not set!");
            return null;
        }

        const db = admin.firestore();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        try {
            const snapshot = await db.collection("withdrawal_requests")
                .where("createdAt", "<", admin.firestore.Timestamp.fromDate(sixMonthsAgo))
                .get();
                
            if (snapshot.empty) {
                console.log("No old records found to delete.");
                return null;
            }
            
            console.log(`Found ${snapshot.size} old records to delete.`);
            
            let deletedCount = 0;
            const batch = db.batch();
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                
                // Delete QR Code from Cloudinary if exists
                if (data.qrCodeUrl) {
                    const publicId = getCloudinaryPublicId(data.qrCodeUrl);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                            console.log(`Deleted QR Code: ${publicId}`);
                        } catch (err) {
                            console.error(`Failed to delete QR Code ${publicId}:`, err);
                        }
                    }
                }
                
                // Delete Slip from Cloudinary if exists
                if (data.slipUrl) {
                    const publicId = getCloudinaryPublicId(data.slipUrl);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                            console.log(`Deleted Slip: ${publicId}`);
                        } catch (err) {
                            console.error(`Failed to delete Slip ${publicId}:`, err);
                        }
                    }
                }
                
                // Delete Firestore document
                batch.delete(doc.ref);
                deletedCount++;
                
                // Firestore batch limit is 500, but we likely won't hit it in one run.
                // If we do, we'd need chunks.
                if (deletedCount >= 400) {
                    break;
                }
            }
            
            if (deletedCount > 0) {
                await batch.commit();
                console.log(`Successfully deleted ${deletedCount} records.`);
            }
            
            return null;
        } catch (error) {
            console.error("Error during cleanup:", error);
            return null;
        }
    });