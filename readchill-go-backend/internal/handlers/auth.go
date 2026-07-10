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

// GetSavedWebtoons returns the list of webtoons saved by the user
func GetSavedWebtoons(c *fiber.Ctx) error {
	uid := c.Locals("uid").(string)

	client := config.FirestoreClient

	doc, err := client.Collection("users").Doc(uid).Get(context.Background())
	if err != nil || !doc.Exists() {
		return c.Status(404).JSON(fiber.Map{"success": false, "error": "User not found"})
	}

	userData := doc.Data()
	var savedWebtoons []interface{}
	if sm, ok := userData["savedWebtoons"].([]interface{}); ok {
		savedWebtoons = sm
	}

	var webtoons []map[string]interface{}
	if len(savedWebtoons) > 0 {
		var docRefs []*firestore.DocumentRef
		for _, webtoonIdInterface := range savedWebtoons {
			if webtoonId, ok := webtoonIdInterface.(string); ok {
				docRefs = append(docRefs, client.Collection("webtoons").Doc(webtoonId))
			}
		}

		if len(docRefs) > 0 {
			docs, err := client.GetAll(context.Background(), docRefs)
			if err == nil {
				for _, webtoonDoc := range docs {
					if webtoonDoc.Exists() {
						data := webtoonDoc.Data()
						data["id"] = webtoonDoc.Ref.ID
						webtoons = append(webtoons, data)
					}
				}
			}
		}
	}

	// Initialize empty slice if null
	if webtoons == nil {
		webtoons = []map[string]interface{}{}
	}

	return c.JSON(fiber.Map{"success": true, "data": webtoons})
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
