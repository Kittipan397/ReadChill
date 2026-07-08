const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// 1. Submit Slip Endpoint
const submitSlip = async (req, res) => {
    try {
        const { slipUrl, packageBaht, packageCoins, bonusCoins, userId } = req.body;

        if (!slipUrl || !packageBaht || !userId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const API_KEY = "SLIPOKPHXCCC8"; // Hardcoded from old system as requested
        
        console.log(`Verifying slip: ${slipUrl}`);

        // 1. Check with SlipOK API
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
            return res.status(400).json({ success: false, message: slipokResult.message || "สลิปไม่ถูกต้อง หรือไม่สามารถตรวจสอบได้" });
        }

        const slipData = slipokResult.data;

        // 2. Validate Amount
        if (slipData.amount < packageBaht) {
            return res.status(400).json({ success: false, message: `ยอดเงินในสลิปไม่ถูกต้อง (พบยอด: ${slipData.amount} บาท, ต้องการ: ${packageBaht} บาท)` });
        }

        // 3. Validate Receiver
        const receiverName = (slipData.receiver.name || "").toUpperCase();
        if (!receiverName.includes("กิตติพันธ์") && !receiverName.includes("KITTIPAN") && !receiverName.includes("SAPMEE")) {
            return res.status(400).json({ success: false, message: `ชื่อบัญชีผู้รับไม่ถูกต้อง (พบชื่อ: ${slipData.receiver.name})` });
        }

        // 4. Validate Date
        if (!slipData.transDate || !slipData.transTime) {
            return res.status(400).json({ success: false, message: "ไม่สามารถอ่านวันและเวลาจากสลิปได้" });
        }

        const transRef = slipData.transRef;
        const totalCoins = (parseInt(packageCoins) || 0) + (parseInt(bonusCoins) || 0);

        // 5. Use Firestore Transaction for deduplication and updating coins
        await db.runTransaction(async (transaction) => {
            // Check Duplicate
            const qDup = db.collection("payments").where("transRef", "==", transRef);
            const dupSnap = await transaction.get(qDup);
            if (!dupSnap.empty) {
                throw new Error("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้!");
            }

            // Create new payment doc
            const newPaymentRef = db.collection("payments").doc();
            transaction.set(newPaymentRef, {
                transRef: transRef,
                userId: userId,
                amount: slipData.amount,
                coinsAdded: totalCoins,
                slipUrl: slipUrl,
                status: "success",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                slipData: slipData
            });

            // Update user coins
            const userRef = db.collection('users').doc(userId);
            transaction.update(userRef, {
                coins: admin.firestore.FieldValue.increment(totalCoins)
            });
        });

        console.log(`Successfully added ${totalCoins} coins to user ${userId}`);
        return res.status(200).json({ success: true, message: 'ทำรายการสำเร็จ! ได้รับเหรียญแล้ว', addedCoins: totalCoins });
        
    } catch (error) {
        console.error('Error processing slip verification:', error);
        // Distinguish between our thrown validation errors and actual server errors
        if (error.message.includes("สลิปนี้ถูกใช้งานไปแล้ว")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ โปรดลองใหม่' });
    }
};

module.exports = {
    submitSlip
};
