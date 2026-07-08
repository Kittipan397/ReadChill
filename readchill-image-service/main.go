package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/nfnt/resize"
)

type UploadResponse struct {
	URL string `json:"url"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}
}

func main() {
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/upload", uploadHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("Image service is running on port %s", port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "ok", "service": "readchill-image-service"}`)
}

func uploadToCloudinaryFallback(buf []byte, filename string) (string, error) {
	cloudinaryUrl := "https://api.cloudinary.com/v1_1/t5bapifi/auto/upload"

	var b bytes.Buffer
	mw := multipart.NewWriter(&b)

	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	fw.Write(buf)

	_ = mw.WriteField("upload_preset", "readchill_unsigned")
	mw.Close()

	req, err := http.NewRequest("POST", cloudinaryUrl, &b)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if secureUrl, ok := result["secure_url"].(string); ok {
		return secureUrl, nil
	}
	
	return "", fmt.Errorf("cloudinary upload failed, response: %v", result)
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Only POST method is allowed")
		return
	}

	// Security: Verify API Key
	expectedAPIKey := os.Getenv("API_KEY")
	if expectedAPIKey != "" {
		clientAPIKey := r.Header.Get("X-API-Key")
		if clientAPIKey == "" {
			// Fallback to Bearer token
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				clientAPIKey = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if clientAPIKey != expectedAPIKey && clientAPIKey != "" {
			respondError(w, http.StatusUnauthorized, "Invalid API Key")
			return
		}
	}

	// 1. Parse Multipart Form (10MB Max Memory)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to parse multipart form: "+err.Error())
		return
	}

	// For compatibility with both 'image' (our old design) and 'file' (Cloudinary standard)
	var file multipart.File
	var header *multipart.FileHeader

	file, header, err = r.FormFile("image")
	if err != nil {
		file, header, err = r.FormFile("file")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Failed to get image/file from form")
			return
		}
	}
	defer file.Close()

	// 2. Decode Image (Supports JPEG/PNG)
	img, format, err := image.Decode(file)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to decode image: "+err.Error())
		return
	}

	log.Printf("Received image format: %s, file: %s", format, header.Filename)

	// 3. Resize Image (Max 1200px width or height)
	bounds := img.Bounds()
	width := uint(bounds.Dx())
	height := uint(bounds.Dy())

	var resizedImg image.Image
	if width > 1200 || height > 1200 {
		if width > height {
			resizedImg = resize.Resize(1200, 0, img, resize.Lanczos3)
		} else {
			resizedImg = resize.Resize(0, 1200, img, resize.Lanczos3)
		}
	} else {
		resizedImg = img
	}

	// 4. Compress Image to JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, resizedImg, &jpeg.Options{Quality: 80})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to compress image: "+err.Error())
		return
	}

	// Generate a unique filename
	ext := filepath.Ext(header.Filename)
	if ext == "" || (strings.ToLower(ext) != ".jpg" && strings.ToLower(ext) != ".jpeg") {
		ext = ".jpg" // Force .jpg extension since we re-encode as JPEG
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// 5. Check if R2 is configured, else fallback to Cloudinary
	r2AccountID := os.Getenv("R2_ACCOUNT_ID")
	r2AccessKey := os.Getenv("R2_ACCESS_KEY_ID")
	r2SecretKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	r2Bucket := os.Getenv("R2_BUCKET_NAME")
	r2PublicURL := os.Getenv("R2_PUBLIC_URL")

	var fileURL string

	if r2AccountID == "" || r2AccessKey == "" || r2SecretKey == "" || r2Bucket == "" {
		log.Println("R2 credentials missing, falling back to Cloudinary")
		
		cloudinaryUrl, err := uploadToCloudinaryFallback(buf.Bytes(), filename)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to upload to Cloudinary: "+err.Error())
			return
		}
		fileURL = cloudinaryUrl

	} else {
		log.Println("R2 credentials found, uploading to Cloudflare R2")
		// 6. Setup AWS SDK v2 and Upload to Cloudflare R2
		r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", r2AccountID),
			}, nil
		})

		cfg, err := config.LoadDefaultConfig(context.TODO(),
			config.WithEndpointResolverWithOptions(r2Resolver),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(r2AccessKey, r2SecretKey, "")),
			config.WithRegion("auto"),
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to configure AWS SDK: "+err.Error())
			return
		}

		s3Client := s3.NewFromConfig(cfg)

		_, err = s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
			Bucket:      aws.String(r2Bucket),
			Key:         aws.String(filename),
			Body:        bytes.NewReader(buf.Bytes()),
			ContentType: aws.String("image/jpeg"),
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to upload to R2: "+err.Error())
			return
		}

		// 7. Generate public URL
		if r2PublicURL != "" {
			fileURL = fmt.Sprintf("%s/%s", strings.TrimSuffix(r2PublicURL, "/"), filename)
		} else {
			fileURL = fmt.Sprintf("https://%s.r2.cloudflarestorage.com/%s/%s", r2AccountID, r2Bucket, filename)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadResponse{URL: fileURL})
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}
