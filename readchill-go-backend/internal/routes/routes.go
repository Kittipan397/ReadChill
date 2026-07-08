package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/kittipan/readchill-backend/internal/handlers"
	"github.com/kittipan/readchill-backend/internal/middlewares"
)

// SetupRoutes registers all API endpoints
func SetupRoutes(api fiber.Router) {
	// Mount Manga routes
	mangaRoutes := api.Group("/mangas")
	mangaRoutes.Get("/", handlers.GetMangas)
	mangaRoutes.Get("/:id", handlers.GetMangaDetail)
	mangaRoutes.Get("/:id/chapters/:chapterId", handlers.GetChapter)
	mangaRoutes.Post("/:id/save", middlewares.VerifyToken, handlers.ToggleSaveManga)

	// Mount Payment routes (SlipOK)
	paymentRoutes := api.Group("/payment")
	paymentRoutes.Post("/submit-slip", middlewares.VerifyToken, handlers.SubmitSlip)

	// Mount Auth routes
	authRoutes := api.Group("/auth")
	authRoutes.Get("/profile", middlewares.VerifyToken, handlers.GetUserProfile)
	authRoutes.Get("/saved-mangas", middlewares.VerifyToken, handlers.GetSavedMangas)
	authRoutes.Get("/custom-token", middlewares.VerifyToken, handlers.GetCustomToken)
}
