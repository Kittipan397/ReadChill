package config

import (
	"context"
	"log"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

var FirebaseApp *firebase.App
var FirestoreClient *firestore.Client

// InitFirebase initializes the Firebase Admin SDK and Firestore client
func InitFirebase() {
	var app *firebase.App
	var err error
	
	// Create a new context for initialization
	ctx := context.Background()
	
	// Check if local serviceAccountKey.json exists
	if _, statErr := os.Stat("serviceAccountKey.json"); statErr == nil {
		opt := option.WithCredentialsFile("serviceAccountKey.json")
		app, err = firebase.NewApp(ctx, nil, opt)
	} else {
		// Fallback to Application Default Credentials (ADC) for Cloud Run
		app, err = firebase.NewApp(ctx, nil)
	}

	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}
	
	FirebaseApp = app
	
	// Initialize Firestore client once to prevent connection leaks
	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("error initializing firestore client: %v\n", err)
	}
	FirestoreClient = client
	
	log.Println("Firebase Admin SDK and Firestore initialized successfully")
}
