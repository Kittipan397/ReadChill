package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/kittipan/readchill-backend/internal/config"
	"github.com/kittipan/readchill-backend/internal/routes"
)

func main() {
	// Load config
	config.LoadConfig()

	// Initialize Firebase
	config.InitFirebase()

	// Initialize Redis
	config.InitRedis()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "ReadChill Go Backend v1.0.0",
		BodyLimit: 10 * 1024 * 1024, // 10MB limit
	})

	// Middlewares
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: config.GetEnv("ALLOWED_ORIGINS", "*"),
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Health check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "readchill-go-backend",
		})
	})

	// Setup API Routes
	api := app.Group("/api/v1")
	routes.SetupRoutes(api)

	// Start server
	port := config.GetEnv("PORT", "4000")
	log.Printf("Starting Go backend on port %s...", port)
	log.Fatal(app.Listen(":" + port))
}
