package handlers

import (
	"context"
	"encoding/json"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"github.com/kittipan/readchill-backend/internal/config"
	"google.golang.org/api/iterator"
)

// GetMangas returns all mangas ordered by views desc
func GetMangas(c *fiber.Ctx) error {
	cacheKey := "mangas_all"
	if config.RedisClient != nil {
		if val, err := config.RedisClient.Get(context.Background(), cacheKey).Result(); err == nil {
			var cached []map[string]interface{}
			if json.Unmarshal([]byte(val), &cached) == nil {
				return c.JSON(fiber.Map{"success": true, "data": cached, "cached": true})
			}
		}
	}

	client := config.FirestoreClient

	iter := client.Collection("mangas").OrderBy("views", firestore.Desc).Documents(context.Background())
	
	var mangas []map[string]interface{}
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
		mangas = append(mangas, data)
	}

	if config.RedisClient != nil {
		if cacheBytes, err := json.Marshal(mangas); err == nil {
			config.RedisClient.Set(context.Background(), cacheKey, cacheBytes, 5*time.Minute)
		}
	}

	return c.JSON(fiber.Map{"success": true, "data": mangas, "cached": false})
}

// GetMangaDetail returns a manga and its chapters
func GetMangaDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	
	client := config.FirestoreClient

	doc, err := client.Collection("mangas").Doc(id).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Manga not found"})
	}

	mangaData := doc.Data()
	mangaData["id"] = doc.Ref.ID

	// Fetch chapters
	iter := client.Collection("mangas").Doc(id).Collection("chapters").OrderBy("number", 1).Documents(context.Background()) // 1 = Ascending
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

	mangaData["chapters"] = chapters

	return c.JSON(fiber.Map{"success": true, "data": mangaData})
}

// GetChapter returns reader images for a specific chapter
func GetChapter(c *fiber.Ctx) error {
	id := c.Params("id")
	chapterId := c.Params("chapterId")
	
	client := config.FirestoreClient

	doc, err := client.Collection("mangas").Doc(id).Collection("chapters").Doc(chapterId).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "Chapter not found"})
	}

	data := doc.Data()
	data["id"] = doc.Ref.ID

	return c.JSON(fiber.Map{"success": true, "data": data})
}

// ToggleSaveManga adds or removes a manga from the user's savedMangas list
func ToggleSaveManga(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)
	mangaId := c.Params("id")

	client := config.FirestoreClient

	userRef := client.Collection("users").Doc(uid)
	docSnap, err := userRef.Get(context.Background())
	
	if err != nil && err.Error() != "rpc error: code = NotFound desc = document not found" {
		// If it's a real error other than not found
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to read user data"})
	}

	var savedMangas []interface{}
	if docSnap.Exists() {
		data := docSnap.Data()
		if sm, ok := data["savedMangas"].([]interface{}); ok {
			savedMangas = sm
		}
	} else {
		// Create the document if it doesn't exist
		_, _ = userRef.Set(context.Background(), map[string]interface{}{
			"savedMangas": []interface{}{},
		})
	}

	// Check if already saved
	isSaved := false
	var updatedSaved []interface{}
	for _, id := range savedMangas {
		if id.(string) == mangaId {
			isSaved = true
		} else {
			updatedSaved = append(updatedSaved, id)
		}
	}

	if isSaved {
		// Remove it
		_, err = userRef.Update(context.Background(), []firestore.Update{
			{Path: "savedMangas", Value: updatedSaved},
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to unsave manga"})
		}
		return c.JSON(fiber.Map{"success": true, "message": "Manga unsaved", "isSaved": false})
	} else {
		// Add it
		updatedSaved = append(updatedSaved, mangaId)
		_, err = userRef.Update(context.Background(), []firestore.Update{
			{Path: "savedMangas", Value: updatedSaved},
		})
		if err != nil {
			// If Update fails because doc is newly created without the field properly initialized by Set, use Set with Merge
			_, err = userRef.Set(context.Background(), map[string]interface{}{
				"savedMangas": updatedSaved,
			}, firestore.MergeAll)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to save manga"})
			}
		}
		return c.JSON(fiber.Map{"success": true, "message": "Manga saved", "isSaved": true})
	}
}
