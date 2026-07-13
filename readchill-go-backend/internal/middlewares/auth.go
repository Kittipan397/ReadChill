package middlewares

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/kittipan/readchill-backend/internal/config"
)

// VerifyToken verifies the Firebase ID token
func VerifyToken(c *fiber.Ctx) error {
	// Allow preflight requests to pass through without verifying token
	if c.Method() == "OPTIONS" {
		return c.Next()
	}

	authHeader := c.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: No token provided"})
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	authClient, err := config.FirebaseApp.Auth(context.Background())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Internal Server Error"})
	}

	token, err := authClient.VerifyIDToken(context.Background(), tokenString)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Unauthorized: Invalid token"})
	}

	// Set user UID in locals
	c.Locals("uid", token.UID)
	return c.Next()
}
