package routes

import (
	"github.com/gofiber/fiber/v2"
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
	webtoonRoutes.Post("/:id/save", middlewares.VerifyToken, handlers.ToggleSaveWebtoon)

	// Mount Payment routes (SlipOK)
	paymentRoutes := api.Group("/payment")
	paymentRoutes.Post("/submit-slip", middlewares.VerifyToken, handlers.SubmitSlip)
	paymentRoutes.Post("/purchase-chapter", middlewares.VerifyToken, handlers.PurchaseChapter)
	paymentRoutes.Post("/donate", middlewares.VerifyToken, handlers.DonateToCreator)
	paymentRoutes.Post("/purchase-shop-item", middlewares.VerifyToken, handlers.PurchaseShopItem)

	// Mount Auth routes
	authRoutes := api.Group("/auth")
	authRoutes.Get("/profile", middlewares.VerifyToken, handlers.GetUserProfile)
	authRoutes.Get("/saved-webtoons", middlewares.VerifyToken, handlers.GetSavedWebtoons)
	authRoutes.Get("/custom-token", middlewares.VerifyToken, handlers.GetCustomToken)
}
