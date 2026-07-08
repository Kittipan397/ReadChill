package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"github.com/kittipan/readchill-backend/internal/config"
	"google.golang.org/api/iterator"
)

type SubmitSlipRequest struct {
	SlipUrl      string `json:"slipUrl"`
	PackageBaht  int    `json:"packageBaht"`
	PackageCoins int    `json:"packageCoins"`
	BonusCoins   int    `json:"bonusCoins"`
}

type SlipokResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    struct {
		Amount    float64 `json:"amount"`
		TransRef  string  `json:"transRef"`
		TransDate string  `json:"transDate"`
		TransTime string  `json:"transTime"`
		Receiver  struct {
			Name string `json:"name"`
		} `json:"receiver"`
	} `json:"data"`
}

// SubmitSlip handles the PromptPay slip verification using SlipOK
func SubmitSlip(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req SubmitSlipRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.SlipUrl == "" || req.PackageBaht == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Missing required fields"})
	}

	apiKey := os.Getenv("SLIPOK_API_KEY")
	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Server configuration error: missing payment API key"})
	}
	apiUrl := "https://api.slipok.com/api/line/apikey/69617"

	// 1. Verify with SlipOK API
	payload, _ := json.Marshal(map[string]string{"url": req.SlipUrl})
	httpReq, _ := http.NewRequest("POST", apiUrl, bytes.NewBuffer(payload))
	httpReq.Header.Set("x-authorization", apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to connect to verification server"})
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var slipokRes SlipokResponse
	if err := json.Unmarshal(bodyBytes, &slipokRes); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Invalid response from verification server"})
	}

	if !slipokRes.Success {
		msg := slipokRes.Message
		if msg == "" {
			msg = "สลิปไม่ถูกต้อง หรือไม่สามารถตรวจสอบได้"
		}
		return c.Status(400).JSON(fiber.Map{"success": false, "message": msg})
	}

	slipData := slipokRes.Data

	// 2. Validate Amount
	if slipData.Amount < float64(req.PackageBaht) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": fmt.Sprintf("ยอดเงินในสลิปไม่ถูกต้อง (พบยอด: %.2f บาท, ต้องการ: %d บาท)", slipData.Amount, req.PackageBaht)})
	}

	// 3. Validate Receiver Name
	receiverName := strings.ToUpper(slipData.Receiver.Name)
	if !strings.Contains(receiverName, "กิตติพันธ์") && !strings.Contains(receiverName, "KITTIPAN") && !strings.Contains(receiverName, "SAPMEE") {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "ชื่อบัญชีผู้รับไม่ถูกต้อง"})
	}

	// 4. Validate Date
	if slipData.TransDate == "" || slipData.TransTime == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "ไม่สามารถอ่านวันและเวลาจากสลิปได้"})
	}

	// Normalize date format (SlipOK might return 20231025 or 2023-10-25)
	dateStr := strings.ReplaceAll(slipData.TransDate, "-", "") 
	timeStr := slipData.TransTime
	
	loc, _ := time.LoadLocation("Asia/Bangkok")
	layout := "20060102 15:04:05"
	// transTime might be HH:mm (missing seconds), pad it if necessary
	if len(strings.Split(timeStr, ":")) == 2 {
		timeStr = timeStr + ":00"
	}

	parsedTime, errParse := time.ParseInLocation(layout, fmt.Sprintf("%s %s", dateStr, timeStr), loc)
	if errParse == nil {
		// Check if slip is older than 30 minutes
		if time.Since(parsedTime) > 30*time.Minute {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "สลิปหมดอายุ (ต้องเป็นสลิปที่โอนภายใน 30 นาที)"})
		}
		// Check if slip is in the future (allow 5 mins clock skew)
		if parsedTime.After(time.Now().In(loc).Add(5 * time.Minute)) {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "เวลาในสลิปไม่ถูกต้อง (เกินเวลาปัจจุบัน)"})
		}
	} else {
		fmt.Printf("Warning: Could not parse slip time: %s %s - Error: %v\n", dateStr, timeStr, errParse)
	}

	transRef := slipData.TransRef
	totalCoins := req.PackageCoins + req.BonusCoins

	client := config.FirestoreClient

	// 5. Firestore Transaction
	ctx := context.Background()
	err = client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Check Duplicate
		iter := client.Collection("payments").Where("transRef", "==", transRef).Documents(ctx)
		defer iter.Stop()
		_, err := iter.Next()
		if err != iterator.Done {
			// Found a duplicate
			return fmt.Errorf("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้")
		}

		// Update User Coins
		userRef := client.Collection("users").Doc(uid)
		err = tx.Update(userRef, []firestore.Update{
			{Path: "coins", Value: firestore.Increment(totalCoins)},
		})
		if err != nil {
			return err
		}

		// Create Payment Document
		newPaymentRef := client.Collection("payments").NewDoc()
		return tx.Set(newPaymentRef, map[string]interface{}{
			"transRef":   transRef,
			"userId":     uid,
			"amount":     slipData.Amount,
			"coinsAdded": totalCoins,
			"slipUrl":    req.SlipUrl,
			"status":     "success",
			"createdAt":  firestore.ServerTimestamp,
			"slipData":   slipData,
		})
	})

	if err != nil {
		if strings.Contains(err.Error(), "ถูกใช้งานไปแล้ว") {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"})
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"message":    "ทำรายการสำเร็จ! ได้รับเหรียญแล้ว",
		"addedCoins": totalCoins,
	})
}

type PurchaseChapterReq struct {
	MangaId   string `json:"mangaId"`
	ChapterId string `json:"chapterId"`
	Price     int    `json:"price"`
}

func PurchaseChapter(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req PurchaseChapterReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.MangaId == "" || req.ChapterId == "" || req.Price <= 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Missing required fields or invalid price"})
	}

	client := config.FirestoreClient
	ctx := context.Background()
	userRef := client.Collection("users").Doc(uid)
	chapterStr := fmt.Sprintf("%s_%s", req.MangaId, req.ChapterId)

	err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Read user data
		doc, err := tx.Get(userRef)
		if err != nil {
			return err
		}

		coins, _ := doc.DataAt("coins")
		unlocked, _ := doc.DataAt("unlockedChapters")

		// Check if already unlocked
		if unlockedArr, ok := unlocked.([]interface{}); ok {
			for _, ch := range unlockedArr {
				if chStr, ok := ch.(string); ok && chStr == chapterStr {
					return fmt.Errorf("ALREADY_UNLOCKED")
				}
			}
		}

		currentCoins := int64(0)
		switch c := coins.(type) {
		case int64:
			currentCoins = c
		case float64:
			currentCoins = int64(c)
		}

		if currentCoins < int64(req.Price) {
			return fmt.Errorf("INSUFFICIENT_COINS")
		}

		// Update user coins and unlockedChapters
		err = tx.Update(userRef, []firestore.Update{
			{Path: "coins", Value: firestore.Increment(-req.Price)},
			{Path: "unlockedChapters", Value: firestore.ArrayUnion(chapterStr)},
		})
		if err != nil {
			return err
		}

		// Record purchase
		purchaseRef := client.Collection("purchases").NewDoc()
		return tx.Set(purchaseRef, map[string]interface{}{
			"userId":    uid,
			"mangaId":   req.MangaId,
			"chapterId": req.ChapterId,
			"price":     req.Price,
			"createdAt": firestore.ServerTimestamp,
		})
	})

	if err != nil {
		if err.Error() == "ALREADY_UNLOCKED" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "ตอนนี้ถูกปลดล็อกไปแล้ว"})
		}
		if err.Error() == "INSUFFICIENT_COINS" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "เหรียญไม่เพียงพอ กรุณาเติมเหรียญ"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการซื้อตอน"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ซื้อตอนสำเร็จ",
	})
}

type DonateReq struct {
	MangaId   string `json:"mangaId"`
	ChapterId string `json:"chapterId"`
	Amount    int    `json:"amount"`
}

func DonateToCreator(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req DonateReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.MangaId == "" || req.Amount <= 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid donation parameters"})
	}

	client := config.FirestoreClient
	ctx := context.Background()
	userRef := client.Collection("users").Doc(uid)

	err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(userRef)
		if err != nil {
			return err
		}

		coins, _ := doc.DataAt("coins")
		currentCoins := int64(0)
		switch c := coins.(type) {
		case int64:
			currentCoins = c
		case float64:
			currentCoins = int64(c)
		}

		if currentCoins < int64(req.Amount) {
			return fmt.Errorf("INSUFFICIENT_COINS")
		}

		err = tx.Update(userRef, []firestore.Update{
			{Path: "coins", Value: firestore.Increment(-req.Amount)},
		})
		if err != nil {
			return err
		}

		donationRef := client.Collection("donations").NewDoc()
		userName, _ := doc.DataAt("displayName")
		return tx.Set(donationRef, map[string]interface{}{
			"userId":    uid,
			"userName":  userName,
			"mangaId":   req.MangaId,
			"chapterId": req.ChapterId,
			"amount":    req.Amount,
			"createdAt": firestore.ServerTimestamp,
		})
	})

	if err != nil {
		if err.Error() == "INSUFFICIENT_COINS" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "เหรียญไม่เพียงพอ"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการสนับสนุน"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "สนับสนุนสำเร็จ ขอบคุณครับ!",
	})
}

type ShopItem struct {
	Id         string   `json:"id"`
	Type       string   `json:"type"`
	Name       string   `json:"name"`
	CoverUrl   string   `json:"coverUrl"`
	ImageUrls  []string `json:"imageUrls"`
	PartnerId  string   `json:"partnerId"`
	Price      int      `json:"price"`
}

func PurchaseShopItem(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req ShopItem
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.Id == "" || req.Type == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Missing item info"})
	}

	client := config.FirestoreClient
	ctx := context.Background()
	userRef := client.Collection("users").Doc(uid)
	invRef := client.Collection("user_inventory").Doc(uid)

	err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// 1. Get User
		userDoc, err := tx.Get(userRef)
		if err != nil {
			return err
		}

		coins, _ := userDoc.DataAt("coins")
		currentCoins := int64(0)
		switch co := coins.(type) {
		case int64:
			currentCoins = co
		case float64:
			currentCoins = int64(co)
		}

		if currentCoins < int64(req.Price) {
			return fmt.Errorf("INSUFFICIENT_COINS")
		}

		// 2. Check Inventory (already owned?)
		invDoc, err := tx.Get(invRef)
		var currentItems []interface{}
		if err == nil && invDoc.Exists() {
			if items, err := invDoc.DataAt("items"); err == nil {
				if itemsArr, ok := items.([]interface{}); ok {
					currentItems = itemsArr
					for _, item := range currentItems {
						if itemMap, ok := item.(map[string]interface{}); ok {
							if itemId, _ := itemMap["itemId"].(string); itemId == req.Id {
								return fmt.Errorf("ALREADY_OWNED")
							}
						}
					}
				}
			}
		}

		// 3. Deduct coins
		if req.Price > 0 {
			err = tx.Update(userRef, []firestore.Update{
				{Path: "coins", Value: firestore.Increment(-req.Price)},
			})
			if err != nil {
				return err
			}
		}

		// 4. Add to inventory
		newItem := map[string]interface{}{
			"itemId":     req.Id,
			"type":       req.Type,
			"name":       req.Name,
			"coverUrl":   req.CoverUrl,
			"imageUrls":  req.ImageUrls,
			"purchasedAt": time.Now(),
		}

		if !invDoc.Exists() {
			err = tx.Set(invRef, map[string]interface{}{
				"items": []interface{}{newItem},
			})
		} else {
			err = tx.Update(invRef, []firestore.Update{
				{Path: "items", Value: firestore.ArrayUnion(newItem)},
			})
		}
		if err != nil {
			return err
		}

		// 5. Record sale for partner
		if req.Price > 0 {
			saleRef := client.Collection("shop_sales").NewDoc()
			return tx.Set(saleRef, map[string]interface{}{
				"itemId":    req.Id,
				"partnerId": req.PartnerId,
				"buyerId":   uid,
				"price":     req.Price,
				"type":      req.Type,
				"createdAt": firestore.ServerTimestamp,
			})
		}
		return nil
	})

	if err != nil {
		if err.Error() == "INSUFFICIENT_COINS" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "เหรียญไม่เพียงพอ"})
		}
		if err.Error() == "ALREADY_OWNED" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "คุณมีสินค้านี้แล้ว"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการซื้อสินค้า"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ซื้อสินค้าสำเร็จ",
	})
}
