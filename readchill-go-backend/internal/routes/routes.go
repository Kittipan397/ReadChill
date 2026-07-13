package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/kittipan/readchill-backend/internal/handlers"
	"github.com/kittipan/readchill-backend/internal/middlewares"
)

// SetupRoutes registers all API endpoints
func SetupRoutes(api fiber.Router) {
	// Mount Webtoon routes
	webtoonRoutes := api.Group("/webtoons")
	webtoonRoutes.Get("/", handlers.GetWebtoons)
	webtoonRoutes.Get("/:id", handlers.GetWebtoonDetail)
	webtoonRoutes.Get("/:id/chapters/:chapterId", handlers.GetChapter)
	webtoonRoutes.Get("/art/:id/download", middlewares.VerifyToken, handlers.DownloadArt)
	webtoonRoutes.Post("/:id/save", middlewares.VerifyToken, handlers.ToggleSaveWebtoon)

	// Rate limiter for payment endpoints (10 requests per minute per IP)
	paymentLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"message": "Too many payment requests, please try again later.",
			})
		},
	})

	// Mount Payment routes (SlipOK)
	paymentRoutes := api.Group("/payment", paymentLimiter)
	paymentRoutes.Post("/submit-slip", middlewares.VerifyToken, handlers.SubmitSlip)
	paymentRoutes.Post("/purchase-chapter", middlewares.VerifyToken, handlers.PurchaseChapter)
	paymentRoutes.Post("/donate", middlewares.VerifyToken, handlers.DonateToCreator)
	paymentRoutes.Post("/purchase-shop-item", middlewares.VerifyToken, handlers.PurchaseShopItem)
	paymentRoutes.Post("/purchase-art", middlewares.VerifyToken, handlers.PurchaseArt)

	// Mount Auth routes
	authRoutes := api.Group("/auth")
	authRoutes.Get("/profile", middlewares.VerifyToken, handlers.GetUserProfile)
	authRoutes.Get("/saved-webtoons", middlewares.VerifyToken, handlers.GetSavedWebtoons)
	authRoutes.Get("/custom-token", middlewares.VerifyToken, handlers.GetCustomToken)
}
