package handlers

import (
	"context"

	"cloud.google.com/go/firestore"
	"github.com/gofiber/fiber/v2"
	"github.com/kittipan/readchill-backend/internal/config"
)

// GetUserProfile returns the authenticated user's profile from Firestore
func GetUserProfile(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	client := config.FirestoreClient

	doc, err := client.Collection("users").Doc(uid).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"error": "User not found in Firestore"})
	}

	userData := doc.Data()
	userData["id"] = doc.Ref.ID

	return c.JSON(fiber.Map{"data": userData})
}

// GetSavedMangas returns the list of mangas saved by the user
func GetSavedMangas(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	client := config.FirestoreClient

	doc, err := client.Collection("users").Doc(uid).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "User not found"})
	}

	userData := doc.Data()
	var savedMangas []interface{}
	if sm, ok := userData["savedMangas"].([]interface{}); ok {
		savedMangas = sm
	}

	var mangas []map[string]interface{}
	if len(savedMangas) > 0 {
		var docRefs []*firestore.DocumentRef
		for _, mangaIdInterface := range savedMangas {
			if mangaId, ok := mangaIdInterface.(string); ok {
				docRefs = append(docRefs, client.Collection("mangas").Doc(mangaId))
			}
		}

		if len(docRefs) > 0 {
			docs, err := client.GetAll(context.Background(), docRefs)
			if err == nil {
				for _, mangaDoc := range docs {
					if mangaDoc.Exists() {
						data := mangaDoc.Data()
						data["id"] = mangaDoc.Ref.ID
						mangas = append(mangas, data)
					}
				}
			}
		}
	}

	// Initialize empty slice if null
	if mangas == nil {
		mangas = []map[string]interface{}{}
	}

	return c.JSON(fiber.Map{"success": true, "data": mangas})
}

// GetCustomToken generates a Firebase custom token for seamless cross-origin auth
func GetCustomToken(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	authClient, err := config.FirebaseApp.Auth(context.Background())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Auth client error"})
	}

	token, err := authClient.CustomToken(context.Background(), uid)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "error": "Failed to create custom token"})
	}

	return c.JSON(fiber.Map{"success": true, "token": token})
}
