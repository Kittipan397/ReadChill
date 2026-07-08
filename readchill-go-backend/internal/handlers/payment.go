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
		apiKey = "SLIPOKPHXCCC8" // Fallback for local dev if not set
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
