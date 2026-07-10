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
			Name  string `json:"name"`
			Proxy struct {
				Type  string `json:"type"`
				Value string `json:"value"`
			} `json:"proxy"`
			Account struct {
				Type  string `json:"type"`
				Value string `json:"value"`
			} `json:"account"`
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

	// 3. Validate Receiver Name and Account/Proxy
	receiverName := strings.ToUpper(slipData.Receiver.Name)
	receiverProxy := slipData.Receiver.Proxy.Value
	receiverAccount := slipData.Receiver.Account.Value
	
	allowedProxy := "" // ถ้าไม่มีให้เว้นว่างไว้
	allowedAccount := "2303193273"

	isProxyMatch := receiverProxy != "" && receiverProxy == allowedProxy
	isAccountMatch := receiverAccount != "" && receiverAccount == allowedAccount
	isNameMatch := strings.Contains(receiverName, "กิตติพันธ์") || strings.Contains(receiverName, "KITTIPAN") || strings.Contains(receiverName, "SAPMEE")

	// ในอนาคตแนะนำให้ลบ isNameMatch ออกแล้วเช็คแค่ Proxy หรือ Account เท่านั้น เพื่อป้องกันการปลอมแปลงชื่อ
	if !isProxyMatch && !isAccountMatch && !isNameMatch {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "ชื่อบัญชีผู้รับโอนหรือหมายเลขบัญชีไม่ถูกต้อง"})
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
	if errParse != nil {
		fmt.Printf("Warning: Could not parse slip time: %s %s - Error: %v\n", dateStr, timeStr, errParse)
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "รูปแบบวันที่และเวลาในสลิปไม่สามารถตรวจสอบได้"})
	}

	// Check if slip is older than 30 minutes
	if time.Since(parsedTime) > 30*time.Minute {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "สลิปหมดอายุ (ต้องเป็นสลิปที่โอนภายใน 30 นาที)"})
	}
	// Check if slip is in the future (allow 5 mins clock skew)
	if parsedTime.After(time.Now().In(loc).Add(5 * time.Minute)) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "เวลาในสลิปไม่ถูกต้อง (เกินเวลาปัจจุบัน)"})
	}

	transRef := slipData.TransRef
	totalCoins := req.PackageCoins + req.BonusCoins

	client := config.FirestoreClient

	// 5. Firestore Transaction
	ctx := context.Background()
	err = client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Check Duplicate inside the transaction lock
		paymentRef := client.Collection("payments").Doc(transRef)
		paymentDoc, err := tx.Get(paymentRef)
		if err == nil && paymentDoc.Exists() {
			// Found a duplicate
			return fmt.Errorf("สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้")
		}

		// Update User Coins (using Set with MergeAll to avoid error if document doesn't exist)
		userRef := client.Collection("users").Doc(uid)
		err = tx.Set(userRef, map[string]interface{}{
			"coins": firestore.Increment(totalCoins),
		}, firestore.MergeAll)
		if err != nil {
			return err
		}

		// Create Payment Document using transRef as ID
		return tx.Set(paymentRef, map[string]interface{}{
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
	WebtoonId   string `json:"webtoonId"`
	ChapterId string `json:"chapterId"`
	Price     int    `json:"price"`
}

func PurchaseChapter(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req PurchaseChapterReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.WebtoonId == "" || req.ChapterId == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Missing required fields"})
	}

	client := config.FirestoreClient
	ctx := context.Background()
	userRef := client.Collection("users").Doc(uid)
	chapterStr := fmt.Sprintf("%s_%s", req.WebtoonId, req.ChapterId)

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

		// Fetch real chapter price from Firestore
		chapterDoc, err := tx.Get(client.Collection("webtoons").Doc(req.WebtoonId).Collection("chapters").Doc(req.ChapterId))
		if err != nil {
			return fmt.Errorf("CHAPTER_NOT_FOUND")
		}

		// Fetch webtoon to get authorId and revenueShare
		webtoonDoc, err := tx.Get(client.Collection("webtoons").Doc(req.WebtoonId))
		if err != nil {
			return fmt.Errorf("WEBTOON_NOT_FOUND")
		}
		
		authorIdVal, _ := webtoonDoc.DataAt("authorId")
		authorId := ""
		if aId, ok := authorIdVal.(string); ok {
			authorId = aId
		}
		
		revenueShareVal, err := webtoonDoc.DataAt("revenueShare")
		revenueShare := int64(73)
		if err == nil {
			switch r := revenueShareVal.(type) {
			case int64: revenueShare = r
			case float64: revenueShare = int64(r)
			case int: revenueShare = int64(r)
			}
		}
		
		chapterCoins, _ := chapterDoc.DataAt("coins")
		realPrice := int64(0)
		switch c := chapterCoins.(type) {
		case int64:
			realPrice = c
		case float64:
			realPrice = int64(c)
		case int:
			realPrice = int64(c)
		}

		if realPrice <= 0 {
			return fmt.Errorf("INVALID_PRICE") // Free chapters should be handled differently or just return error
		}

		currentCoins := int64(0)
		switch c := coins.(type) {
		case int64:
			currentCoins = c
		case float64:
			currentCoins = int64(c)
		}

		if currentCoins < realPrice {
			return fmt.Errorf("INSUFFICIENT_COINS")
		}

		// Update user coins and unlockedChapters
		err = tx.Update(userRef, []firestore.Update{
			{Path: "coins", Value: firestore.Increment(-realPrice)},
			{Path: "unlockedChapters", Value: firestore.ArrayUnion(chapterStr)},
		})
		if err != nil {
			return err
		}

		// Calculate Shares
		partnerShare := (realPrice * revenueShare) / 100
		platformShare := realPrice - partnerShare

		// Update partner's revenueBalance
		if authorId != "" {
			partnerRef := client.Collection("users").Doc(authorId)
			err = tx.Set(partnerRef, map[string]interface{}{
				"revenueBalance": firestore.Increment(partnerShare),
			}, firestore.MergeAll)
			if err != nil {
				return err
			}
		}

		// Record purchase
		purchaseRef := client.Collection("purchases").NewDoc()
		return tx.Set(purchaseRef, map[string]interface{}{
			"userId":    uid,
			"webtoonId":   req.WebtoonId,
			"chapterId": req.ChapterId,
			"price":     realPrice,
			"partnerId": authorId,
			"partnerShare": partnerShare,
			"platformShare": platformShare,
			"revenueShareRate": revenueShare,
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
		if err.Error() == "CHAPTER_NOT_FOUND" {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "ไม่พบตอนที่ต้องการซื้อ"})
		}
		if err.Error() == "INVALID_PRICE" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "ตอนนี้ไม่สามารถซื้อได้ (ราคาไม่ถูกต้อง)"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการซื้อตอน"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ซื้อตอนสำเร็จ",
	})
}

type DonateReq struct {
	WebtoonId   string `json:"webtoonId"`
	ChapterId string `json:"chapterId"`
	Amount    int    `json:"amount"`
}

func DonateToCreator(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req DonateReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.WebtoonId == "" || req.Amount <= 0 {
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

		// Fetch webtoon to get authorId and revenueShare
		webtoonDoc, err := tx.Get(client.Collection("webtoons").Doc(req.WebtoonId))
		if err != nil {
			return fmt.Errorf("WEBTOON_NOT_FOUND")
		}
		
		authorIdVal, _ := webtoonDoc.DataAt("authorId")
		authorId := ""
		if aId, ok := authorIdVal.(string); ok {
			authorId = aId
		}
		
		revenueShareVal, err := webtoonDoc.DataAt("revenueShare")
		revenueShare := int64(73)
		if err == nil {
			switch r := revenueShareVal.(type) {
			case int64: revenueShare = r
			case float64: revenueShare = int64(r)
			case int: revenueShare = int64(r)
			}
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

		// Calculate Shares
		amountInt64 := int64(req.Amount)
		partnerShare := (amountInt64 * revenueShare) / 100
		platformShare := amountInt64 - partnerShare

		// Update partner's revenueBalance
		if authorId != "" {
			partnerRef := client.Collection("users").Doc(authorId)
			err = tx.Set(partnerRef, map[string]interface{}{
				"revenueBalance": firestore.Increment(partnerShare),
			}, firestore.MergeAll)
			if err != nil {
				return err
			}
		}

		donationRef := client.Collection("donations").NewDoc()
		userName, _ := doc.DataAt("displayName")
		return tx.Set(donationRef, map[string]interface{}{
			"userId":    uid,
			"userName":  userName,
			"webtoonId":   req.WebtoonId,
			"chapterId": req.ChapterId,
			"amount":    req.Amount,
			"partnerId": authorId,
			"partnerShare": partnerShare,
			"platformShare": platformShare,
			"revenueShareRate": revenueShare,
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

		// Fetch real item price from Firestore
		itemDoc, err := tx.Get(client.Collection("shop_items").Doc(req.Id))
		if err != nil {
			return fmt.Errorf("ITEM_NOT_FOUND")
		}

		itemPriceVal, _ := itemDoc.DataAt("price")
		realPrice := int64(0)
		switch p := itemPriceVal.(type) {
		case int64:
			realPrice = p
		case float64:
			realPrice = int64(p)
		case int:
			realPrice = int64(p)
		}

		if realPrice < 0 {
			return fmt.Errorf("INVALID_PRICE")
		}

		coins, _ := userDoc.DataAt("coins")
		currentCoins := int64(0)
		switch co := coins.(type) {
		case int64:
			currentCoins = co
		case float64:
			currentCoins = int64(co)
		}

		if currentCoins < realPrice {
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
		if realPrice > 0 {
			err = tx.Update(userRef, []firestore.Update{
				{Path: "coins", Value: firestore.Increment(-realPrice)},
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
		if realPrice > 0 {
			partnerShare := (realPrice * 73) / 100
			platformShare := realPrice - partnerShare

			if req.PartnerId != "" {
				partnerRef := client.Collection("users").Doc(req.PartnerId)
				err = tx.Set(partnerRef, map[string]interface{}{
					"revenueBalance": firestore.Increment(partnerShare),
				}, firestore.MergeAll)
				if err != nil {
					return err
				}
			}

			saleRef := client.Collection("shop_sales").NewDoc()
			return tx.Set(saleRef, map[string]interface{}{
				"itemId":    req.Id,
				"partnerId": req.PartnerId,
				"buyerId":   uid,
				"price":     realPrice,
				"partnerShare": partnerShare,
				"platformShare": platformShare,
				"revenueShareRate": 73,
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
		if err.Error() == "ITEM_NOT_FOUND" {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "ไม่พบสินค้า"})
		}
		if err.Error() == "INVALID_PRICE" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "ราคาสินค้าไม่ถูกต้อง"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการซื้อสินค้า"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ซื้อสินค้าสำเร็จ",
	})
}

type PurchaseArtReq struct {
	ArtId string `json:"artId"`
	Price int    `json:"price"`
}

func PurchaseArt(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	var req PurchaseArtReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.ArtId == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Missing required fields"})
	}

	client := config.FirestoreClient
	ctx := context.Background()
	userRef := client.Collection("users").Doc(uid)

	err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		// Read user data
		doc, err := tx.Get(userRef)
		if err != nil {
			return err
		}

		coins, _ := doc.DataAt("coins")
		unlocked, _ := doc.DataAt("unlockedArts")

		// Check if already unlocked
		if unlockedArr, ok := unlocked.([]interface{}); ok {
			for _, art := range unlockedArr {
				if artStr, ok := art.(string); ok && artStr == req.ArtId {
					return fmt.Errorf("ALREADY_UNLOCKED")
				}
			}
		}

		// Fetch art (webtoon) from Firestore
		artDoc, err := tx.Get(client.Collection("webtoons").Doc(req.ArtId))
		if err != nil {
			return fmt.Errorf("ART_NOT_FOUND")
		}
		
		artCoins, _ := artDoc.DataAt("defaultPrice")
		realPrice := int64(0)
		switch c := artCoins.(type) {
		case int64:
			realPrice = c
		case float64:
			realPrice = int64(c)
		case int:
			realPrice = int64(c)
		}

		if realPrice <= 0 {
			return fmt.Errorf("INVALID_PRICE")
		}

		currentCoins := int64(0)
		switch c := coins.(type) {
		case int64:
			currentCoins = c
		case float64:
			currentCoins = int64(c)
		}

		if currentCoins < realPrice {
			return fmt.Errorf("INSUFFICIENT_COINS")
		}

		// Fetch authorId and revenueShare
		authorIdVal, _ := artDoc.DataAt("authorId")
		authorId := ""
		if aId, ok := authorIdVal.(string); ok {
			authorId = aId
		}
		
		revenueShareVal, err := artDoc.DataAt("revenueShare")
		revenueShare := int64(73)
		if err == nil {
			switch r := revenueShareVal.(type) {
			case int64: revenueShare = r
			case float64: revenueShare = int64(r)
			case int: revenueShare = int64(r)
			}
		}

		partnerShare := (realPrice * revenueShare) / 100
		platformShare := realPrice - partnerShare

		// Update partner's revenueBalance
		if authorId != "" {
			partnerRef := client.Collection("users").Doc(authorId)
			err = tx.Set(partnerRef, map[string]interface{}{
				"revenueBalance": firestore.Increment(partnerShare),
			}, firestore.MergeAll)
			if err != nil {
				return err
			}
		}

		// Update user coins and unlockedArts
		err = tx.Update(userRef, []firestore.Update{
			{Path: "coins", Value: firestore.Increment(-realPrice)},
			{Path: "unlockedArts", Value: firestore.ArrayUnion(req.ArtId)},
		})
		if err != nil {
			// If unlockedArts field doesn't exist, we might need Set with MergeAll
			err = tx.Set(userRef, map[string]interface{}{
				"coins": firestore.Increment(-realPrice),
				"unlockedArts": firestore.ArrayUnion(req.ArtId),
			}, firestore.MergeAll)
			if err != nil {
				return err
			}
		}

		// Record purchase
		purchaseRef := client.Collection("purchases").NewDoc()
		return tx.Set(purchaseRef, map[string]interface{}{
			"userId":    uid,
			"artId":     req.ArtId,
			"price":     realPrice,
			"partnerId": authorId,
			"partnerShare": partnerShare,
			"platformShare": platformShare,
			"revenueShareRate": revenueShare,
			"type":      "art",
			"createdAt": firestore.ServerTimestamp,
		})
	})

	if err != nil {
		if err.Error() == "ALREADY_UNLOCKED" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "ตอนนี้คุณเป็นเจ้าของภาพนี้แล้ว"})
		}
		if err.Error() == "INSUFFICIENT_COINS" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "เหรียญไม่เพียงพอ กรุณาเติมเหรียญ"})
		}
		if err.Error() == "ART_NOT_FOUND" {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "ไม่พบภาพวาดที่ต้องการซื้อ"})
		}
		if err.Error() == "INVALID_PRICE" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "ภาพวาดนี้ไม่สามารถซื้อได้"})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "เกิดข้อผิดพลาดในการซื้อภาพวาด"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "ซื้อภาพวาดสำเร็จ",
	})
}
