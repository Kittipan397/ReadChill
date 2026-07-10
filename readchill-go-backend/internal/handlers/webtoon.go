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

	// Fetch chapters
	iter := client.Collection("webtoons").Doc(id).Collection("chapters").OrderBy("number", 1).Documents(context.Background()) // 1 = Ascending
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
