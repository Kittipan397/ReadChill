package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"github.com/kittipan/readchill-backend/internal/config"
	"google.golang.org/api/iterator"
)

// GetWebtoons returns webtoons with pagination and type filtering
func GetWebtoons(c *fiber.Ctx) error {
	webtoonType := c.Query("type", "")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 24)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 24
	}

	cacheKeyData := fmt.Sprintf("webtoons_data_type_%s_page_%d_limit_%d", webtoonType, page, limit)
	
	client := config.FirestoreClient
	var webtoons []map[string]interface{}
	
	// Try Redis Cache for data
	if config.RedisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if val, err := config.RedisClient.Get(ctx, cacheKeyData).Result(); err == nil {
			cancel()
			if json.Unmarshal([]byte(val), &webtoons) == nil {
				// We also need total count. Let's just fetch it from cache or DB separately.
			}
		}
	}

	if webtoons == nil {
		query := client.Collection("webtoons").OrderBy("createdAt", firestore.Desc)
		if webtoonType != "" {
			query = query.Where("type", "==", webtoonType)
		}
		
		offset := (page - 1) * limit
		iter := query.Offset(offset).Limit(limit).Documents(context.Background())
		
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "error": err.Error()})
			}
			
			data := doc.Data()
			data["id"] = doc.Ref.ID
			webtoons = append(webtoons, data)
		}
		
		if webtoons == nil {
			webtoons = []map[string]interface{}{}
		}

		if config.RedisClient != nil {
			if cacheBytes, err := json.Marshal(webtoons); err == nil {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				config.RedisClient.Set(ctx, cacheKeyData, cacheBytes, 5*time.Minute)
				cancel()
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true, 
		"data": webtoons,
	})
}

// GetWebtoonDetail returns a webtoon and its chapters
func GetWebtoonDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	
	client := config.FirestoreClient

	doc, err := client.Collection("webtoons").Doc(id).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Webtoon not found"})
	}

	webtoonData := doc.Data()
	webtoonData["id"] = doc.Ref.ID

	ip := c.IP()
	// Increment view count asynchronously (with Rate Limiting)
	go func(webtoonId string, userIp string) {
		if config.RedisClient != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			key := fmt.Sprintf("rate:view:%s:%s", webtoonId, userIp)
			ok, _ := config.RedisClient.SetNX(ctx, key, "1", 5*time.Minute).Result()
			if !ok {
				return // Already viewed recently by this IP, don't increment Firestore
			}
		}

		client.Collection("webtoons").Doc(webtoonId).Update(context.Background(), []firestore.Update{
			{Path: "views", Value: firestore.Increment(1)},
		})
	}(id, ip)

	// Fetch chapters (Limited to 1000 to prevent DoS/OOM)
	iter := client.Collection("webtoons").Doc(id).Collection("chapters").OrderBy("number", 1).Limit(1000).Documents(context.Background()) // 1 = Ascending
	var chapters []map[string]interface{}
	
	for {
		cDoc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			continue // Skip errors on subcollection
		}
		cData := cDoc.Data()
		cData["id"] = cDoc.Ref.ID
		chapters = append(chapters, cData)
	}

	webtoonData["chapters"] = chapters

	return c.JSON(fiber.Map{"success": true, "data": webtoonData})
}

// GetChapter returns reader images for a specific chapter
func GetChapter(c *fiber.Ctx) error {
	id := c.Params("id")
	chapterId := c.Params("chapterId")
	
	client := config.FirestoreClient

	doc, err := client.Collection("webtoons").Doc(id).Collection("chapters").Doc(chapterId).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Chapter not found"})
	}

	data := doc.Data()
	data["id"] = doc.Ref.ID

	ip := c.IP()
	// Increment view count asynchronously (with Rate Limiting)
	go func(webtoonId string, userIp string) {
		if config.RedisClient != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			key := fmt.Sprintf("rate:view:%s:%s", webtoonId, userIp)
			ok, _ := config.RedisClient.SetNX(ctx, key, "1", 5*time.Minute).Result()
			if !ok {
				return // Already viewed recently by this IP, don't increment Firestore
			}
		}

		client.Collection("webtoons").Doc(webtoonId).Update(context.Background(), []firestore.Update{
			{Path: "views", Value: firestore.Increment(1)},
		})
	}(id, ip)

	return c.JSON(fiber.Map{"success": true, "data": data})
}

// ToggleSaveWebtoon adds or removes a webtoon from the user's savedWebtoons list
func ToggleSaveWebtoon(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)
	webtoonId := c.Params("id")

	client := config.FirestoreClient

	userRef := client.Collection("users").Doc(uid)
	docSnap, err := userRef.Get(context.Background())
	
	if err != nil && err.Error() != "rpc error: code = NotFound desc = document not found" {
		// If it's a real error other than not found
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to read user data"})
	}

	var savedWebtoons []interface{}
	if docSnap.Exists() {
		data := docSnap.Data()
		if sm, ok := data["savedWebtoons"].([]interface{}); ok {
			savedWebtoons = sm
		}
	} else {
		// Create the document if it doesn't exist
		_, _ = userRef.Set(context.Background(), map[string]interface{}{
			"savedWebtoons": []interface{}{},
		})
	}

	// Check if already saved
	isSaved := false
	var updatedSaved []interface{}
	for _, id := range savedWebtoons {
		if id.(string) == webtoonId {
			isSaved = true
		} else {
			updatedSaved = append(updatedSaved, id)
		}
	}

	if isSaved {
		// Remove it
		_, err = userRef.Update(context.Background(), []firestore.Update{
			{Path: "savedWebtoons", Value: updatedSaved},
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to unsave webtoon"})
		}
		return c.JSON(fiber.Map{"success": true, "message": "Webtoon unsaved", "isSaved": false})
	} else {
		// Add it
		updatedSaved = append(updatedSaved, webtoonId)
		_, err = userRef.Update(context.Background(), []firestore.Update{
			{Path: "savedWebtoons", Value: updatedSaved},
		})
		if err != nil {
			// If Update fails because doc is newly created without the field properly initialized by Set, use Set with Merge
			_, err = userRef.Set(context.Background(), map[string]interface{}{
				"savedWebtoons": updatedSaved,
			}, firestore.MergeAll)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to save webtoon"})
			}
		}
		return c.JSON(fiber.Map{"success": true, "message": "Webtoon saved", "isSaved": true})
	}
}

// DownloadArt returns the original high-res image URL if the user has purchased it or if it is free.
func DownloadArt(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)
	id := c.Params("id")

	client := config.FirestoreClient

	// Fetch Art
	artDoc, err := client.Collection("webtoons").Doc(id).Get(context.Background())
	if err != nil || !artDoc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Art not found"})
	}

	artData := artDoc.Data()
	artType, _ := artData["type"].(string)
	if artType != "art" {
		return c.Status(400).JSON(fiber.Map{"success": false, "error": "Invalid art"})
	}

	priceVal, _ := artData["defaultPrice"]
	price := int64(0)
	switch p := priceVal.(type) {
	case int64: price = p
	case float64: price = int64(p)
	case int: price = int64(p)
	}

	// Fetch User
	userDoc, err := client.Collection("users").Doc(uid).Get(context.Background())
	if err != nil || !userDoc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "User not found"})
	}

	hasAccess := false
	if price <= 0 {
		hasAccess = true // Free
	} else {
		// Check unlockedArts
		unlockedVal, _ := userDoc.DataAt("unlockedArts")
		if unlockedArr, ok := unlockedVal.([]interface{}); ok {
			for _, uArt := range unlockedArr {
				if uArtStr, ok := uArt.(string); ok && uArtStr == id {
					hasAccess = true
					break
				}
			}
		}
	}

	if !hasAccess {
		return c.Status(403).JSON(fiber.Map{"success": false, "error": "คุณยังไม่ได้ซื้อภาพนี้"})
	}

	originalUrl, ok := artData["originalUrl"].(string)
	if !ok || originalUrl == "" {
		// Fallback to coverUrl if original is not uploaded yet
		originalUrl, _ = artData["coverUrl"].(string)
	}

	return c.JSON(fiber.Map{
		"success": true, 
		"data": map[string]string{
			"downloadUrl": originalUrl,
		},
	})
}
